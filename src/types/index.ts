export interface Plan {
  id: bigint;
  creator: `0x${string}`;
  price: bigint; // in wei (native BOT)
  interval: bigint; // in seconds
  active: boolean;
  metadataURI: string;
  createdAt: bigint;
  // Parsed metadata fields:
  name?: string;
  description?: string;
  category?: string;
  perks?: string[];
  creatorName?: string;
}

export interface Subscription {
  id: bigint;
  planId: bigint;
  subscriber: `0x${string}`;
  amount: bigint;
  startedAt: bigint;
  nextPaymentTime: bigint;
  paymentsMade: bigint;
  active: boolean;
  status?: SubscriptionStatus;
}

export enum SubscriptionStatus {
  NONE = 0,
  ACTIVE = 1,
  PAYMENT_DUE = 2,
  CANCELED = 3,
}

export interface PlanMetadata {
  name: string;
  description: string;
  category?: string;
  perks?: string[];
  creatorName?: string;
}

export interface ProtocolActivity {
  id: string;
  type: "PlanCreated" | "SubscriptionCreated" | "SubscriptionRenewed" | "SubscriptionCanceled" | "EarningsWithdrawn";
  title: string;
  description: string;
  user: `0x${string}`;
  amount?: bigint;
  timestamp: number;
  txHash?: string;
}
