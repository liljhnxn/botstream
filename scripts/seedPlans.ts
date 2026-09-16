import hre from "hardhat";
const { ethers } = hre;
import * as dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("==========================================");
  console.log("Seeding Demo Subscription Plans on Botchain");
  console.log("==========================================");

  const [signer] = await ethers.getSigners();
  const contractAddress = process.env.NEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS is not set in environment.");
  }

  console.log(`Signer Address:   ${signer.address}`);
  console.log(`Contract Address: ${contractAddress}`);

  const botStream = await ethers.getContractAt("BotStream", contractAddress, signer);

  const currentPlanCount = await botStream.getPlanCount();
  console.log(`Current on-chain plan count: ${currentPlanCount}`);

  const plansToSeed = [
    {
      price: ethers.parseEther("0.005"), // 0.005 BOT
      interval: 30 * 24 * 60 * 60,       // 30 Days
      metadata: {
        name: "Developer API Pro",
        description: "Unlimited access to high-speed Botchain RPC nodes, websocket feeds, and priority indexing APIs.",
        category: "Developer Tools",
        perks: [
          "50,000 requests / day",
          "Dedicated WebSocket Streams",
          "99.9% SLA Guarantee",
          "Direct Developer Telegram Support",
        ],
      },
    },
    {
      price: ethers.parseEther("0.01"),  // 0.01 BOT
      interval: 7 * 24 * 60 * 60,        // 7 Days
      metadata: {
        name: "Alpha Trading Signals",
        description: "Real-time on-chain DEX flow analytics, whale tracking alerts, and automated momentum signals.",
        category: "Trading Signals",
        perks: [
          "Real-Time Whale Tracker",
          "Private Telegram Channel",
          "Automated Scalp Alerts",
          "Weekly Market Recap",
        ],
      },
    },
    {
      price: ethers.parseEther("0.008"), // 0.008 BOT
      interval: 90 * 24 * 60 * 60,       // 90 Days
      metadata: {
        name: "DAO Contributor Pass",
        description: "Quarterly governance voting multiplier, private forum access, and quarterly ecosystem rewards.",
        category: "DAO Membership",
        perks: [
          "2x Governance Weight",
          "Private Discord Lounge",
          "Quarterly Airdrop Allocation",
          "Proposal Co-Sponsorship",
        ],
      },
    },
  ];

  for (let i = 0; i < plansToSeed.length; i++) {
    const item = plansToSeed[i];
    const metadataURI = JSON.stringify({
      ...item.metadata,
      creator: signer.address,
      createdAt: Math.floor(Date.now() / 1000),
    });

    console.log(`\nCreating Plan ${i + 1}: ${item.metadata.name}...`);
    const tx = await botStream.createPlan(item.price, item.interval, metadataURI);
    console.log(`Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(` Plan created in block ${receipt?.blockNumber}! (Gas used: ${receipt?.gasUsed})`);
  }

  const newPlanCount = await botStream.getPlanCount();
  console.log("\n==========================================");
  console.log(`Seeding complete! Total on-chain plans: ${newPlanCount}`);
  console.log(`View on BohrScan: https://scan.bohr.life/address/${contractAddress}`);
  console.log("==========================================");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
