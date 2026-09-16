import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { BotStream } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BotStream Protocol", function () {
  let botStream: BotStream;
  let deployer: HardhatEthersSigner;
  let creator1: HardhatEthersSigner;
  let creator2: HardhatEthersSigner;
  let subscriber1: HardhatEthersSigner;
  let subscriber2: HardhatEthersSigner;

  const ONE_DAY = 24 * 60 * 60;
  const THIRTY_DAYS = 30 * ONE_DAY;
  const PLAN_PRICE = ethers.parseEther("5.0"); // 5 BOT
  const PLAN_URI = "ipfs://bafybeibotstreammetadata123";

  beforeEach(async function () {
    [deployer, creator1, creator2, subscriber1, subscriber2] = await ethers.getSigners();

    const BotStreamFactory = await ethers.getContractFactory("BotStream");
    botStream = (await BotStreamFactory.deploy()) as BotStream;
    await botStream.waitForDeployment();
  });

  describe("Deployment & Initialization", function () {
    it("should initialize with 0 plans and 0 subscriptions", async function () {
      expect(await botStream.getPlanCount()).to.equal(0n);
      expect(await botStream.getSubscriptionCount()).to.equal(0n);
      expect(await botStream.nextPlanId()).to.equal(1n);
      expect(await botStream.nextSubscriptionId()).to.equal(1n);
    });
  });

  describe("Plan Creation & Management", function () {
    it("should allow a creator to create a valid subscription plan", async function () {
      const tx = await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);
      await expect(tx)
        .to.emit(botStream, "PlanCreated")
        .withArgs(1n, creator1.address, PLAN_PRICE, THIRTY_DAYS, PLAN_URI);

      expect(await botStream.getPlanCount()).to.equal(1n);

      const plan = await botStream.getPlan(1);
      expect(plan.id).to.equal(1n);
      expect(plan.creator).to.equal(creator1.address);
      expect(plan.price).to.equal(PLAN_PRICE);
      expect(plan.interval).to.equal(THIRTY_DAYS);
      expect(plan.active).to.be.true;
      expect(plan.metadataURI).to.equal(PLAN_URI);

      const creatorPlans = await botStream.getCreatorPlans(creator1.address);
      expect(creatorPlans.length).to.equal(1);
      expect(creatorPlans[0]).to.equal(1n);
    });

    it("should reject plan creation with zero price", async function () {
      await expect(
        botStream.connect(creator1).createPlan(0n, THIRTY_DAYS, PLAN_URI)
      ).to.be.revertedWith("Price must be greater than zero");
    });

    it("should reject plan creation with zero interval", async function () {
      await expect(
        botStream.connect(creator1).createPlan(PLAN_PRICE, 0n, PLAN_URI)
      ).to.be.revertedWith("Interval must be greater than zero");
    });

    it("should allow creator to deactivate and reactivate their plan", async function () {
      await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);

      // Deactivate
      await expect(botStream.connect(creator1).setPlanStatus(1, false))
        .to.emit(botStream, "PlanStatusChanged")
        .withArgs(1n, false);

      let plan = await botStream.getPlan(1);
      expect(plan.active).to.be.false;

      // Reactivate
      await expect(botStream.connect(creator1).setPlanStatus(1, true))
        .to.emit(botStream, "PlanStatusChanged")
        .withArgs(1n, true);

      plan = await botStream.getPlan(1);
      expect(plan.active).to.be.true;
    });

    it("should reject non-creator from changing plan status", async function () {
      await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);

      await expect(
        botStream.connect(creator2).setPlanStatus(1, false)
      ).to.be.revertedWith("Only plan creator can change status");
    });

    it("should revert if trying to change status of non-existent plan", async function () {
      await expect(
        botStream.connect(creator1).setPlanStatus(999, false)
      ).to.be.revertedWith("Plan does not exist");
    });
  });

  describe("Subscribing", function () {
    beforeEach(async function () {
      await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);
    });

    it("should allow a user to subscribe with exact BOT payment", async function () {
      const tx = await botStream.connect(subscriber1).subscribe(1, { value: PLAN_PRICE });
      const currentBlock = await ethers.provider.getBlock("latest");
      const blockTimestamp = currentBlock!.timestamp;
      const expectedNextPayment = blockTimestamp + THIRTY_DAYS;

      await expect(tx)
        .to.emit(botStream, "SubscriptionCreated")
        .withArgs(1n, 1n, subscriber1.address, PLAN_PRICE, expectedNextPayment);

      expect(await botStream.getSubscriptionCount()).to.equal(1n);

      const sub = await botStream.getSubscription(1);
      expect(sub.id).to.equal(1n);
      expect(sub.planId).to.equal(1n);
      expect(sub.subscriber).to.equal(subscriber1.address);
      expect(sub.amount).to.equal(PLAN_PRICE);
      expect(sub.paymentsMade).to.equal(1n);
      expect(sub.active).to.be.true;
      expect(sub.nextPaymentTime).to.equal(BigInt(expectedNextPayment));

      // Creator earnings increased
      expect(await botStream.getCreatorEarnings(creator1.address)).to.equal(PLAN_PRICE);

      // Subscriber mappings
      const userSubs = await botStream.getSubscriberSubscriptions(subscriber1.address);
      expect(userSubs.length).to.equal(1);
      expect(userSubs[0]).to.equal(1n);

      // Status should be ACTIVE
      expect(await botStream.getSubscriptionStatus(1)).to.equal(1); // ACTIVE = 1
      expect(await botStream.isSubscriptionDue(1)).to.be.false;
    });

    it("should reject subscription with incorrect BOT payment", async function () {
      // Too little
      await expect(
        botStream.connect(subscriber1).subscribe(1, { value: ethers.parseEther("4.9") })
      ).to.be.revertedWith("Incorrect payment amount");

      // Too much
      await expect(
        botStream.connect(subscriber1).subscribe(1, { value: ethers.parseEther("5.1") })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("should reject subscription to an inactive plan", async function () {
      await botStream.connect(creator1).setPlanStatus(1, false);

      await expect(
        botStream.connect(subscriber1).subscribe(1, { value: PLAN_PRICE })
      ).to.be.revertedWith("Plan is currently inactive");
    });

    it("should reject subscription to a non-existent plan", async function () {
      await expect(
        botStream.connect(subscriber1).subscribe(999, { value: PLAN_PRICE })
      ).to.be.revertedWith("Plan does not exist");
    });
  });

  describe("Subscription Renewal", function () {
    beforeEach(async function () {
      await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);
      await botStream.connect(subscriber1).subscribe(1, { value: PLAN_PRICE });
    });

    it("should reject renewal if payment is not due yet", async function () {
      // 10 days passed, not 30 days yet
      await time.increase(10 * ONE_DAY);

      expect(await botStream.isSubscriptionDue(1)).to.be.false;
      expect(await botStream.getSubscriptionStatus(1)).to.equal(1); // ACTIVE

      await expect(
        botStream.connect(subscriber1).renewSubscription(1, { value: PLAN_PRICE })
      ).to.be.revertedWith("Payment is not due yet");
    });

    it("should allow renewal when payment is due and update nextPaymentTime", async function () {
      // Advance time by 30 days
      await time.increase(THIRTY_DAYS + 1);

      expect(await botStream.isSubscriptionDue(1)).to.be.true;
      expect(await botStream.getSubscriptionStatus(1)).to.equal(2); // PAYMENT_DUE = 2

      const tx = await botStream.connect(subscriber1).renewSubscription(1, { value: PLAN_PRICE });
      const currentBlock = await ethers.provider.getBlock("latest");
      const blockTimestamp = currentBlock!.timestamp;
      const expectedNext = blockTimestamp + THIRTY_DAYS;

      await expect(tx)
        .to.emit(botStream, "SubscriptionRenewed")
        .withArgs(1n, PLAN_PRICE, expectedNext);

      const sub = await botStream.getSubscription(1);
      expect(sub.paymentsMade).to.equal(2n);
      expect(sub.nextPaymentTime).to.equal(BigInt(expectedNext));
      expect(sub.active).to.be.true;

      // Creator earnings doubled (5 + 5 = 10 BOT)
      expect(await botStream.getCreatorEarnings(creator1.address)).to.equal(ethers.parseEther("10.0"));

      // Status should now be active again
      expect(await botStream.isSubscriptionDue(1)).to.be.false;
      expect(await botStream.getSubscriptionStatus(1)).to.equal(1); // ACTIVE
    });

    it("should reject renewal with incorrect payment", async function () {
      await time.increase(THIRTY_DAYS + 1);

      await expect(
        botStream.connect(subscriber1).renewSubscription(1, { value: ethers.parseEther("3.0") })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("should reject renewal if caller is not the subscriber", async function () {
      await time.increase(THIRTY_DAYS + 1);

      await expect(
        botStream.connect(subscriber2).renewSubscription(1, { value: PLAN_PRICE })
      ).to.be.revertedWith("Only subscriber can renew");
    });
  });

  describe("Subscription Cancellation", function () {
    beforeEach(async function () {
      await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);
      await botStream.connect(subscriber1).subscribe(1, { value: PLAN_PRICE });
    });

    it("should allow subscriber to cancel subscription", async function () {
      const tx = await botStream.connect(subscriber1).cancelSubscription(1);
      await expect(tx)
        .to.emit(botStream, "SubscriptionCanceled")
        .withArgs(1n, subscriber1.address);

      const sub = await botStream.getSubscription(1);
      expect(sub.active).to.be.false;
      expect(await botStream.getSubscriptionStatus(1)).to.equal(3); // CANCELED = 3
    });

    it("should reject non-subscriber from canceling subscription", async function () {
      await expect(
        botStream.connect(subscriber2).cancelSubscription(1)
      ).to.be.revertedWith("Only subscriber can cancel");
    });

    it("should reject canceling an already canceled subscription", async function () {
      await botStream.connect(subscriber1).cancelSubscription(1);

      await expect(
        botStream.connect(subscriber1).cancelSubscription(1)
      ).to.be.revertedWith("Subscription is already inactive");
    });

    it("should not allow renewal of a canceled subscription even if time has passed", async function () {
      await botStream.connect(subscriber1).cancelSubscription(1);
      await time.increase(THIRTY_DAYS + 1);

      await expect(
        botStream.connect(subscriber1).renewSubscription(1, { value: PLAN_PRICE })
      ).to.be.revertedWith("Subscription is canceled");
    });
  });

  describe("Creator Earnings & Withdrawals", function () {
    beforeEach(async function () {
      await botStream.connect(creator1).createPlan(PLAN_PRICE, THIRTY_DAYS, PLAN_URI);
      await botStream.connect(creator2).createPlan(PLAN_PRICE * 2n, THIRTY_DAYS, PLAN_URI);

      await botStream.connect(subscriber1).subscribe(1, { value: PLAN_PRICE });
      await botStream.connect(subscriber2).subscribe(2, { value: PLAN_PRICE * 2n });
    });

    it("should accurately track separate earnings for different creators", async function () {
      expect(await botStream.getCreatorEarnings(creator1.address)).to.equal(PLAN_PRICE);
      expect(await botStream.getCreatorEarnings(creator2.address)).to.equal(PLAN_PRICE * 2n);
    });

    it("should allow creator to withdraw their accumulated earnings", async function () {
      const initialBalance = await ethers.provider.getBalance(creator1.address);

      const tx = await botStream.connect(creator1).withdrawEarnings();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx)
        .to.emit(botStream, "EarningsWithdrawn")
        .withArgs(creator1.address, PLAN_PRICE);

      // Pending earnings reset to zero
      expect(await botStream.getCreatorEarnings(creator1.address)).to.equal(0n);

      // Balance received
      const finalBalance = await ethers.provider.getBalance(creator1.address);
      expect(finalBalance).to.equal(initialBalance + PLAN_PRICE - gasUsed);

      // creator2 earnings are untouched
      expect(await botStream.getCreatorEarnings(creator2.address)).to.equal(PLAN_PRICE * 2n);
    });

    it("should revert if creator has zero pending earnings", async function () {
      await expect(
        botStream.connect(deployer).withdrawEarnings()
      ).to.be.revertedWith("No pending earnings to withdraw");

      // Once creator1 withdraws, a second withdrawal should fail
      await botStream.connect(creator1).withdrawEarnings();
      await expect(
        botStream.connect(creator1).withdrawEarnings()
      ).to.be.revertedWith("No pending earnings to withdraw");
    });
  });
});
