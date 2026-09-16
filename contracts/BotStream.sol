// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BotStream — On-Chain Recurring Subscription Protocol
 * @notice Allows creators to establish decentralized recurring subscription tiers in native BOT,
 *         and subscribers to initiate, track, manually renew when due, and cancel subscriptions.
 * @dev Implements secure checks-effects-interactions accounting with ReentrancyGuard.
 *      Native BOT cannot be automatically pulled from user wallets without a transaction,
 *      so subscriptions are funded upfront and manually renewed when due.
 */
contract BotStream is ReentrancyGuard {

    // ==========================================
    // DATA STRUCTURES
    // ==========================================

    /**
     * @notice Represents an on-chain recurring subscription tier
     * @param id Unique identifier for the plan
     * @param creator The address that created the plan and earns payments
     * @param price Amount in native BOT (wei) required per billing cycle
     * @param interval Duration of each billing cycle in seconds (e.g., 2592000 for 30 days)
     * @param active Whether new subscriptions are currently accepted
     * @param metadataURI IPFS or JSON URI containing title, description, benefits
     * @param createdAt Timestamp when the plan was registered
     */
    struct Plan {
        uint256 id;
        address creator;
        uint256 price;
        uint256 interval;
        bool active;
        string metadataURI;
        uint256 createdAt;
    }

    /**
     * @notice Represents an active or historical user subscription
     * @param id Unique identifier for the subscription
     * @param planId Identifier of the subscribed plan
     * @param subscriber Wallet address of the subscriber
     * @param amount Price paid per cycle in native BOT (wei)
     * @param startedAt Timestamp when the subscription was initially created
     * @param nextPaymentTime Timestamp when the current period expires and renewal is due
     * @param paymentsMade Number of successful payment cycles completed
     * @param active Whether the subscription is currently active (not canceled)
     */
    struct Subscription {
        uint256 id;
        uint256 planId;
        address subscriber;
        uint256 amount;
        uint256 startedAt;
        uint256 nextPaymentTime;
        uint256 paymentsMade;
        bool active;
    }

    /**
     * @notice Enumeration of discrete subscription states for frontend consumption
     */
    enum SubscriptionStatus {
        NONE,
        ACTIVE,
        PAYMENT_DUE,
        CANCELED
    }

    // ==========================================
    // STATE VARIABLES
    // ==========================================

    /// @notice Next plan ID counter, starting at 1
    uint256 public nextPlanId = 1;

    /// @notice Next subscription ID counter, starting at 1
    uint256 public nextSubscriptionId = 1;

    /// @notice Mapping from plan ID to Plan details
    mapping(uint256 => Plan) public plans;

    /// @notice Mapping from subscription ID to Subscription details
    mapping(uint256 => Subscription) public subscriptions;

    /// @notice Mapping of subscriber address to list of subscription IDs
    mapping(address => uint256[]) private subscriberSubscriptions;

    /// @notice Mapping of creator address to list of created plan IDs
    mapping(address => uint256[]) private creatorPlans;

    /// @notice Mapping of creator address to pending native BOT earnings available for withdrawal
    mapping(address => uint256) public pendingEarnings;

    // ==========================================
    // EVENTS
    // ==========================================

    event PlanCreated(
        uint256 indexed planId,
        address indexed creator,
        uint256 price,
        uint256 interval,
        string metadataURI
    );

    event PlanStatusChanged(
        uint256 indexed planId,
        bool active
    );

    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        uint256 indexed planId,
        address indexed subscriber,
        uint256 amount,
        uint256 nextPaymentTime
    );

    event SubscriptionRenewed(
        uint256 indexed subscriptionId,
        uint256 amount,
        uint256 nextPaymentTime
    );

    event SubscriptionCanceled(
        uint256 indexed subscriptionId,
        address indexed subscriber
    );

    event EarningsWithdrawn(
        address indexed creator,
        uint256 amount
    );

    // ==========================================
    // CREATOR FUNCTIONS
    // ==========================================

    /**
     * @notice Creates a new subscription plan
     * @param price Price in native BOT (wei) per billing interval
     * @param interval Duration in seconds per billing cycle
     * @param metadataURI URI string holding plan metadata (title, perks, description)
     * @return planId The newly assigned plan ID
     */
    function createPlan(
        uint256 price,
        uint256 interval,
        string calldata metadataURI
    ) external returns (uint256 planId) {
        require(price > 0, "Price must be greater than zero");
        require(interval > 0, "Interval must be greater than zero");

        planId = nextPlanId++;

        plans[planId] = Plan({
            id: planId,
            creator: msg.sender,
            price: price,
            interval: interval,
            active: true,
            metadataURI: metadataURI,
            createdAt: block.timestamp
        });

        creatorPlans[msg.sender].push(planId);

        emit PlanCreated(planId, msg.sender, price, interval, metadataURI);
    }

    /**
     * @notice Allows a creator to activate or deactivate their plan
     * @dev Deactivating prevents new subscriptions but does not cancel existing active subscriptions
     * @param planId The ID of the plan to modify
     * @param active New active state
     */
    function setPlanStatus(uint256 planId, bool active) external {
        require(planId > 0 && planId < nextPlanId, "Plan does not exist");
        Plan storage plan = plans[planId];
        require(plan.creator == msg.sender, "Only plan creator can change status");

        plan.active = active;

        emit PlanStatusChanged(planId, active);
    }

    /**
     * @notice Allows a creator to withdraw accumulated subscription earnings
     * @dev Follows strict checks-effects-interactions pattern with ReentrancyGuard
     */
    function withdrawEarnings() external nonReentrant {
        uint256 amount = pendingEarnings[msg.sender];
        require(amount > 0, "No pending earnings to withdraw");

        // Effects
        pendingEarnings[msg.sender] = 0;

        // Interactions
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Native BOT transfer failed");

        emit EarningsWithdrawn(msg.sender, amount);
    }

    // ==========================================
    // SUBSCRIBER FUNCTIONS
    // ==========================================

    /**
     * @notice Subscribes to an active plan with exact upfront payment
     * @param planId The ID of the plan to subscribe to
     * @return subscriptionId The newly created subscription ID
     */
    function subscribe(uint256 planId) external payable nonReentrant returns (uint256 subscriptionId) {
        require(planId > 0 && planId < nextPlanId, "Plan does not exist");
        Plan storage plan = plans[planId];
        require(plan.active, "Plan is currently inactive");
        require(msg.value == plan.price, "Incorrect payment amount");

        subscriptionId = nextSubscriptionId++;
        uint256 nextPayment = block.timestamp + plan.interval;

        subscriptions[subscriptionId] = Subscription({
            id: subscriptionId,
            planId: planId,
            subscriber: msg.sender,
            amount: plan.price,
            startedAt: block.timestamp,
            nextPaymentTime: nextPayment,
            paymentsMade: 1,
            active: true
        });

        subscriberSubscriptions[msg.sender].push(subscriptionId);

        // Credit creator earnings
        pendingEarnings[plan.creator] += msg.value;

        emit SubscriptionCreated(
            subscriptionId,
            planId,
            msg.sender,
            plan.price,
            nextPayment
        );
    }

    /**
     * @notice Renews an active subscription when payment is due
     * @dev Calculated from block.timestamp + interval so late renewals do not penalize users
     * @param subscriptionId The ID of the subscription to renew
     */
    function renewSubscription(uint256 subscriptionId) external payable nonReentrant {
        require(subscriptionId > 0 && subscriptionId < nextSubscriptionId, "Subscription does not exist");
        Subscription storage sub = subscriptions[subscriptionId];

        require(sub.active, "Subscription is canceled");
        require(msg.sender == sub.subscriber, "Only subscriber can renew");
        require(block.timestamp >= sub.nextPaymentTime, "Payment is not due yet");

        Plan storage plan = plans[sub.planId];
        require(msg.value == plan.price, "Incorrect payment amount");

        sub.paymentsMade += 1;
        sub.nextPaymentTime = block.timestamp + plan.interval;

        // Credit creator earnings
        pendingEarnings[plan.creator] += msg.value;

        emit SubscriptionRenewed(
            subscriptionId,
            msg.value,
            sub.nextPaymentTime
        );
    }

    /**
     * @notice Cancels an active subscription
     * @dev Disables future renewals. Previous payments are non-refundable in this MVP.
     * @param subscriptionId The ID of the subscription to cancel
     */
    function cancelSubscription(uint256 subscriptionId) external {
        require(subscriptionId > 0 && subscriptionId < nextSubscriptionId, "Subscription does not exist");
        Subscription storage sub = subscriptions[subscriptionId];

        require(msg.sender == sub.subscriber, "Only subscriber can cancel");
        require(sub.active, "Subscription is already inactive");

        sub.active = false;

        emit SubscriptionCanceled(subscriptionId, msg.sender);
    }

    // ==========================================
    // VIEW / READ FUNCTIONS
    // ==========================================

    /**
     * @notice Returns plan details by ID
     */
    function getPlan(uint256 planId) external view returns (Plan memory) {
        require(planId > 0 && planId < nextPlanId, "Plan does not exist");
        return plans[planId];
    }

    /**
     * @notice Returns subscription details by ID
     */
    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        require(subscriptionId > 0 && subscriptionId < nextSubscriptionId, "Subscription does not exist");
        return subscriptions[subscriptionId];
    }

    /**
     * @notice Total number of created plans
     */
    function getPlanCount() external view returns (uint256) {
        return nextPlanId - 1;
    }

    /**
     * @notice Total number of created subscriptions
     */
    function getSubscriptionCount() external view returns (uint256) {
        return nextSubscriptionId - 1;
    }

    /**
     * @notice Returns all subscription IDs belonging to a subscriber
     */
    function getSubscriberSubscriptions(address subscriber) external view returns (uint256[] memory) {
        return subscriberSubscriptions[subscriber];
    }

    /**
     * @notice Returns all plan IDs created by a creator
     */
    function getCreatorPlans(address creator) external view returns (uint256[] memory) {
        return creatorPlans[creator];
    }

    /**
     * @notice Returns accumulated pending earnings for a creator
     */
    function getCreatorEarnings(address creator) external view returns (uint256) {
        return pendingEarnings[creator];
    }

    /**
     * @notice Checks if a subscription is currently due for renewal
     */
    function isSubscriptionDue(uint256 subscriptionId) external view returns (bool) {
        if (subscriptionId == 0 || subscriptionId >= nextSubscriptionId) {
            return false;
        }
        Subscription storage sub = subscriptions[subscriptionId];
        return sub.active && block.timestamp >= sub.nextPaymentTime;
    }

    /**
     * @notice Returns computed status for a given subscription ID
     */
    function getSubscriptionStatus(uint256 subscriptionId) external view returns (SubscriptionStatus) {
        if (subscriptionId == 0 || subscriptionId >= nextSubscriptionId) {
            return SubscriptionStatus.NONE;
        }
        Subscription storage sub = subscriptions[subscriptionId];
        if (!sub.active) {
            return SubscriptionStatus.CANCELED;
        }
        if (block.timestamp >= sub.nextPaymentTime) {
            return SubscriptionStatus.PAYMENT_DUE;
        }
        return SubscriptionStatus.ACTIVE;
    }
}
