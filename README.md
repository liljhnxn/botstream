# BotStream — On-Chain Subscription Protocol

> **"Subscribe. Renew. On-Chain."**  
> *Decentralized recurring subscriptions powered by Botchain Testnet.*

---

## Overview

**BotStream** is a production-grade Web3 subscription protocol deployed on **Botchain / Bohr Testnet (Chain ID 968)**. It enables decentralized creators, SaaS protocols, and Web3 services to create customizable subscription tiers priced in native **BOT** tokens, while empowering subscribers with full custody, transparent billing cycles, and frictionless one-click manual renewals.

### Core Philosophy: Honest Non-Custodial Billing
Because native blockchain currencies (such as ETH or BOT) cannot be silently withdrawn from a user's wallet without an explicit cryptographically-signed transaction, BotStream does not implement deceptive "fake auto-debits." 

Instead:
1. **Upfront Payment**: The user pays for their initial cycle when subscribing.
2. **Deployed & Verified Contract**: [`0x5d9Eb95f4Eaaaa2b7d6a3b06D463644ae4E47C7b`](https://scan.bohr.life/address/0x5d9Eb95f4Eaaaa2b7d6a3b06D463644ae4E47C7b#code) (Verified on BohrScan)
3. **Deterministic Cycles**: An on-chain timestamp (`nextPaymentTime`) tracks when the next period is due.
4. **Explicit Renewal**: When due (`block.timestamp >= nextPaymentTime`), the subscriber confirms a renewal transaction in their wallet to extend access.
5. **Fair Grace Period**: Late renewals calculate the new billing cycle starting from the moment of renewal (`block.timestamp + interval`), ensuring subscribers are never penalized.

---

## System Architecture

```
                                  +-----------------------+
                                  |  Subscriber's Wallet  |
                                  +-----------+-----------+
                                              |
                          subscribe(planId)   |   renewSubscription(subId)
                          [Sends Native BOT]  |   [Sends Native BOT]
                                              v
+------------------+             +------------+-----------+             +-----------------+
|  Creator Wallet  | <---------- |     BotStream.sol      | ----------> | BohrScan / RPC  |
+------------------+   withdraw  |   (ReentrancyGuard)    |    Events   |  (Chain ID 968) |
                       Earnings  +------------+-----------+             +-----------------+
                                              |
                                              | Accounting:
                                              | pendingEarnings[creator] += msg.value
                                              v
                                  +-----------------------+
                                  | Creator Escrow Ledger |
                                  +-----------------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Smart Contract** | Solidity `^0.8.24` | Core protocol, reentrancy guards, accounting |
| **Framework** | Hardhat 2 / Ethers v6 | Compilation, simulation, and automated test suite |
| **Security** | OpenZeppelin Contracts v5 | ReentrancyGuard, Checks-Effects-Interactions |
| **Frontend** | Next.js 14 (App Router) | High-performance server and client rendering |
| **Language** | TypeScript | Strict type safety across contracts and UI |
| **Styling** | Tailwind CSS & Vanilla CSS | Cyberpunk Web3 theme, glassmorphism, glowing micro-animations |
| **Web3 Client** | Wagmi v2 & Viem | Reactive contract reads, writes, and wallet connectors |
| **Icons** | Lucide React | Modern minimalist icons |
| **Network** | Botchain / Bohr Testnet | High-speed, EVM-compatible decentralized infrastructure |

---

## Smart Contract Architecture

The primary contract is located at [`contracts/BotStream.sol`](contracts/BotStream.sol).

### Key Data Structures

#### Plan
```solidity
struct Plan {
    uint256 id;
    address creator;
    uint256 price;       // in wei (native BOT)
    uint256 interval;    // in seconds (e.g., 2592000 for 30 days)
    bool active;         // controls whether new subscriptions are allowed
    string metadataURI;  // JSON or IPFS URI with name, perks, description
    uint256 createdAt;   // block timestamp
}
```

#### Subscription
```solidity
struct Subscription {
    uint256 id;
    uint256 planId;
    address subscriber;
    uint256 amount;          // cycle fee in wei
    uint256 startedAt;       // initial subscribe timestamp
    uint256 nextPaymentTime; // billing deadline
    uint256 paymentsMade;    // count of cycles successfully funded
    bool active;             // active vs canceled status
}
```

### Protocol Accounting & Creator Escrow
When a user subscribes or renews, payments are accumulated in `pendingEarnings`:
```solidity
pendingEarnings[creator] += msg.value;
```
Creators withdraw their accumulated funds at any time using:
```solidity
function withdrawEarnings() external nonReentrant {
    uint256 amount = pendingEarnings[msg.sender];
    require(amount > 0, "No pending earnings to withdraw");
    pendingEarnings[msg.sender] = 0;
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Native BOT transfer failed");
    emit EarningsWithdrawn(msg.sender, amount);
}
```
This isolates creator funds, eliminates systemic pool risks, prevents reentrancy, and guarantees creators can only withdraw their own balance.

---

## Botchain Testnet Configuration

| Parameter | Value |
| :--- | :--- |
| **Network Name** | Botchain / Bohr Testnet |
| **Chain ID** | `968` |
| **RPC Endpoint** | `https://rpc.bohr.life` |
| **Block Explorer** | `https://scan.bohr.life` |
| **Native Token** | BOT |
| **Decimals** | 18 |

---

## Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd botstream
npm install --legacy-peer-deps
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the following:
```env
NEXT_PUBLIC_BOTCHAIN_CHAIN_ID=968
NEXT_PUBLIC_BOTCHAIN_RPC_URL=https://rpc.bohr.life
NEXT_PUBLIC_BOTCHAIN_EXPLORER_URL=https://scan.bohr.life
NEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS=0x5d9Eb95f4Eaaaa2b7d6a3b06D463644ae4E47C7b

# For deploying smart contracts
BOTCHAIN_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
```

---

## Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server at `http://localhost:3000` |
| `npm run build` | Builds an optimized production bundle |
| `npm run start` | Runs the production Next.js server |
| `npm run compile` | Compiles the Solidity contracts via Hardhat |
| `npm run test:contracts` | Executes the complete 22-test Hardhat test suite |
| `npm run deploy:botchain` | Deploys `BotStream.sol` to Botchain Testnet and syncs ABI |
| `npm run deploy:local` | Deploys `BotStream.sol` to a local Hardhat node |

---

## Smart Contract Testing

BotStream features a comprehensive 22-test suite testing:
- Plan creation with parameter validation (zero price/interval rejection)
- Access controls (only creator can deactivate/reactivate plans)
- Exact payment validation on subscriptions
- Rejection of subscriptions to deactivated or non-existent plans
- Renewal eligibility (rejection if not due yet, execution when due)
- Late renewal timestamp math (`block.timestamp + interval`)
- Subscriber cancellation and permanent disablement of renewals
- Isolated creator accounting and self-service non-reentrant withdrawals
- Event parameter verification for all protocol lifecycle changes

Run the tests:
```bash
npm run test:contracts
```

**Results:**
```
  BotStream Protocol
    Deployment & Initialization
      √ should initialize with 0 plans and 0 subscriptions
    Plan Creation & Management
      √ should allow a creator to create a valid subscription plan
      √ should reject plan creation with zero price
      √ should reject plan creation with zero interval
      √ should allow creator to deactivate and reactivate their plan
      √ should reject non-creator from changing plan status
      √ should revert if trying to change status of non-existent plan
    Subscribing
      √ should allow a user to subscribe with exact BOT payment
      √ should reject subscription with incorrect BOT payment
      √ should reject subscription to an inactive plan
      √ should reject subscription to a non-existent plan
    Subscription Renewal
      √ should reject renewal if payment is not due yet
      √ should allow renewal when payment is due and update nextPaymentTime
      √ should reject renewal with incorrect payment
      √ should reject renewal if caller is not the subscriber
    Subscription Cancellation
      √ should allow subscriber to cancel subscription
      √ should reject non-subscriber from canceling subscription
      √ should reject canceling an already canceled subscription
      √ should not allow renewal of a canceled subscription even if time has passed
    Creator Earnings & Withdrawals
      √ should accurately track separate earnings for different creators
      √ should allow creator to withdraw their accumulated earnings
      √ should revert if creator has zero pending earnings

  22 passing (2s)
```

---

## Deployment to Botchain Testnet

1. Ensure your deployer wallet holds native BOT on Botchain Testnet (Chain ID 968).
2. Set your private key in `.env.local`:
   ```env
   BOTCHAIN_PRIVATE_KEY=0x...
   ```
3. Run the automated deployment script:
   ```bash
   npm run deploy:botchain
   ```
4. The deployment script will:
   - Compile the contracts.
   - Deploy `BotStream` to Botchain Testnet.
   - Print the deployed address and BohrScan explorer URL.
   - Automatically write the address and full ABI directly to `src/config/contracts.ts`.

---

## Frontend Features & Pages

- **Landing Page (`/`)**: Hero banner, live protocol metrics, "How It Works" 3-step guide, creator/subscriber value propositions, and non-custodial billing notice.
- **Explore Plans (`/plans`)**: Search and filter on-chain tiers, preview perks, inspect creator addresses with BotNS abstraction, and trigger instant subscription checkout.
- **Plan Details (`/plans/[id]`)**: Deep-dive page with full description, included features, creator profile, and direct subscription button.
- **Create Plan (`/create`)**: Intuitive form with preset intervals (7d, 30d, 90d, 365d, or custom days), price input, perk tags, and transaction modal.
- **Subscriber Dashboard (`/dashboard/subscriptions`)**: Tracks active, due, and canceled subscriptions with live countdown clocks, renewal triggers, and cancellation buttons.
- **Creator Dashboard (`/dashboard/creator`)**: Comprehensive analytics, total plans, pending earnings, one-click `withdrawEarnings()` button, and tier status toggling (activate/deactivate).
- **Protocol Activity (`/activity`)**: Real-time event log reading on-chain events (`PlanCreated`, `SubscriptionCreated`, `SubscriptionRenewed`, `EarningsWithdrawn`).

---

## BotNS Integration Architecture

BotStream is engineered to be **BotNS-Ready**. The identity resolver module [`src/utils/botns.ts`](src/utils/botns.ts) implements:
```typescript
export function resolveIdentity(address: string | undefined): { name: string; isBotNS: boolean }
```
In the MVP, this formats the wallet address into a clean shortened format (e.g. `0x12...AB34`). When the BotNS registry contract is live on Botchain, this abstraction seamlessly resolves registered `.bot` domain names (e.g. `alex.bot`) without requiring changes to UI components.

---

## Security Considerations

1. **Reentrancy Protection**: All payable state-modifying functions and withdrawals implement OpenZeppelin's `ReentrancyGuard`.
2. **Checks-Effects-Interactions**: Pending earnings are zeroed out before any native BOT transfer occurs.
3. **Exact Amount Matching**: Subscriptions and renewals strictly require `msg.value == plan.price`. Overpayments and underpayments are immediately reverted.
4. **Zero Administrative Backdoors**: No central admin key can drain user subscriptions or seize creator escrow balances.
5. **Private Key Protection**: Private keys are loaded strictly via environment variables and never logged or included in git commits.

---

## Future Roadmap

- [ ] **ERC-20 Stream Allowances**: Allowance-based automatic renewals for ERC-20 tokens (e.g., USDT, USDC).
- [ ] **On-Chain BotNS Resolver**: Direct lookup of `.bot` names for creators and subscribers.
- [ ] **NFT Membership Passes**: Soulbound or transferable ERC-721 receipts representing subscription status.
- [ ] **Creator Analytics**: Historical revenue charts, churn rates, and retention graphs.
- [ ] **Grace Periods**: Configurable post-due grace periods before service gating.
- [ ] **Subscription Webhook API**: Developer SDK for SaaS backends to verify subscription status via RPC.
- [ ] **DAO-Governed Tiers**: Multi-sig and DAO support for creator plan management.

---

## License
MIT License. Free to use for educational and production purposes.
