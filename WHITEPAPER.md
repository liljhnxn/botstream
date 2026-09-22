# BotStream — Whitepaper
**The Non-Custodial Recurring Subscription Protocol on EVM**

*Author*: BotStream Core Contributors  
*Target Network*: Botchain / Bohr Testnet (Chain ID 968)  
*Contract Address*: [`0x5d9Eb95f4Eaaaa2b7d6a3b06D463644ae4E47C7b`](https://scan.bohr.life/address/0x5d9Eb95f4Eaaaa2b7d6a3b06D463644ae4E47C7b#code)  
*Repository*: [https://github.com/liljhnxn/botstream](https://github.com/liljhnxn/botstream)  
*Live Specification*: [https://github.com/liljhnxn/botstream/blob/main/WHITEPAPER.md](https://github.com/liljhnxn/botstream/blob/main/WHITEPAPER.md)

---

## Executive Summary

Traditional recurring billing models depend heavily on centralized payment processors (Stripe, PayPal, Chargebee) that extract 2.9%–10% in platform fees, impose regional gatekeeping, and retain unilateral authority to freeze merchant accounts or cancel payments. 

In Web3, subscriptions have historically struggled with the "Push vs. Pull" dilemma: native blockchain currencies (such as ETH or native BOT) cannot be silently debited from a user's wallet without an explicit cryptographically signed transaction. Existing "solutions" either demand users deposit funds into vulnerable custodial pools or use obscure ERC-20 allowances prone to drainage exploits.

**BotStream** solves this through a non-custodial, event-driven smart contract protocol. It enables creators, decentralized SaaS platforms, and Web3 communities to establish recurring subscription tiers paid in native BOT. Subscribers maintain complete custody over their assets, benefit from deterministic cycle math with built-in grace periods, and execute 1-click renewals and cancellations.

---

## 1. Problem Statement

### 1.1 Web2 Payment Gateway Monopolies
* **Exorbitant Take Rates**: Traditional subscription stacks charge 2.9% + $0.30 per transaction plus cross-border currency conversion fees.
* **Censorship & Chargeback Vulnerabilities**: Creators face arbitrary account freezes and chargeback fraud without recourse.
* **Data Extraction**: Subscribers must surrender credit card numbers, billing addresses, and personal identities for basic digital subscriptions.

### 1.2 The Web3 Recurring Billing Dilemma
* **Native Currency Constraint**: Native gas tokens (BOT/ETH) lack standard `transferFrom` approval mechanics.
* **The Custodial Trap**: Many protocols force users to deposit large balances into off-chain or protocol escrows, re-introducing smart contract liquidation risks.
* **Deceptive Auto-Debits**: Relayer-based debit systems require user keys or unlimited approvals, creating massive security hazards.

---

## 2. The BotStream Solution

BotStream enforces an honest, transparent, and non-custodial recurring subscription model:

1. **Native BOT Billing**: Plans are denominated directly in native BOT, eliminating token approvals or wrapper overhead.
2. **Deterministic Lifecycle Clock**: Every subscription records `startedAt`, `interval`, and `nextPaymentTime` on-chain.
3. **1-Click Renewal Flow**: When `block.timestamp >= nextPaymentTime`, the subscriber renews via a simple signed wallet transaction.
4. **Fair Renewal Grace Period**: If a subscriber renews late, their next period begins at `block.timestamp + interval` (rather than penalizing the missed inactive duration).
5. **Direct Pull Payouts**: Funds are locked in isolated creator balances (`pendingEarnings[creator]`), withdrawable anytime via ReentrancyGuard-protected payouts.

---

## 3. Protocol Architecture

### 3.1 Smart Contract Layer (`BotStream.sol`)
The core contract is built with Solidity `^0.8.24` and OpenZeppelin's `ReentrancyGuard`.

* **`createPlan(uint256 price, uint256 interval, string metadataURI)`**:
  Registers an immutable tier with specified duration and price.
* **`subscribe(uint256 planId)`**:
  Validates `msg.value == plan.price`, provisions a `Subscription` struct, and credits `pendingEarnings[creator]`.
* **`renewSubscription(uint256 subId)`**:
  Validates eligibility, extends `nextPaymentTime`, and transfers cycle payment to creator ledger.
* **`cancelSubscription(uint256 subId)`**:
  Sets `active = false`. Access remains valid until `nextPaymentTime` expires.
* **`withdrawEarnings()`**:
  Transfers accrued creator earnings using secure Checks-Effects-Interactions pattern.

### 3.2 System Flowchart

```
 [Subscriber]                          [BotStream.sol]                       [Creator]
      |                                       |                                  |
      |--- subscribe(planId) + [BOT Fee] ---->|                                  |
      |                                       |--- credit pendingEarnings ------>|
      |                                       |                                  |
      |   (Interval passes...)                |                                  |
      |                                       |                                  |
      |--- renewSubscription(subId) --------->|                                  |
      |                                       |--- credit pendingEarnings ------>|
      |                                       |                                  |
      |                                       |<-- withdrawEarnings() -----------|
      |                                       |---- transfer accrued BOT ------->|
```

---

## 4. Subscription State Machine

Subscriptions transition across four deterministic states:

```
                  +---------------------------+
                  |         INACTIVE          |
                  +-------------+-------------+
                                | subscribe()
                                v
                  +---------------------------+
       +--------->|          ACTIVE           |<---------+
       |          | (now < nextPaymentTime)   |          |
       |          +-------------+-------------+          |
       |                        |                        |
       | renew()                | now >= nextPaymentTime | renew()
       |                        v                        |
       |          +---------------------------+          |
       +----------+        PAYMENT_DUE        +----------+
                  +-------------+-------------+
                                | cancel()
                                v
                  +---------------------------+
                  |         CANCELED          |
                  +---------------------------+
```

---

## 5. Security & Risk Analysis

* **Zero Reentrancy Risk**: All state mutations precede external calls, wrapped in OpenZeppelin `nonReentrant`.
* **No Fund Trapping**: Creators can withdraw at any time; no global locking of protocol funds.
* **Complete Self-Custody**: Subscribers never deposit more than one interval's fee at a time.
* **Immutable Accounting**: Plan prices cannot be retroactively altered on existing subscribers.

---

## 6. Tokenomics & Fee Model

* **Protocol Fee**: 0% in V1 to foster ecosystem adoption.
* **Gas Efficiency**: Optimized transaction pathways minimize execution costs on EVM/Botchain.
* **SaaS Integration**: Simple Webhook and RPC listeners allow off-chain APIs to gate access based on `isSubscriptionActive(subId)`.

---

## 7. Roadmap

* **Phase 1 (Completed)**: Core contracts deployed & verified on BohrScan Testnet; full dApp dashboard, plan creator, and live activity stream.
* **Phase 2**: EIP-712 Meta-transactions & Account Abstraction (ERC-4337) session keys for optional automated batch renewals.
* **Phase 3**: Dynamic tier NFTs representing transferable subscription access passes.
