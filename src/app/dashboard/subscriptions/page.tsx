"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { BOTSTREAM_CONTRACT_ADDRESS, BOTSTREAM_ABI } from "@/config/contracts";
import { Subscription, Plan, SubscriptionStatus } from "@/types";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { StatCard } from "@/components/StatCard";
import { UserCheck, AlertCircle, CheckCircle, XCircle, RefreshCw, Compass, Wallet } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export default function SubscriberDashboardPage() {
  const { address, isConnected } = useAccount();

  // 1. Fetch all subscription IDs for connected address
  const {
    data: subIdsData,
    isLoading: isSubIdsLoading,
    refetch: refetchSubIds,
  } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getSubscriberSubscriptions",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const subIds = (subIdsData as bigint[]) || [];

  // 2. Multicall getSubscription for each ID
  const subCalls = useMemo(() => {
    return subIds.map((id) => ({
      address: BOTSTREAM_CONTRACT_ADDRESS,
      abi: BOTSTREAM_ABI,
      functionName: "getSubscription" as const,
      args: [id],
    }));
  }, [subIds]);

  const {
    data: subsData,
    isLoading: isSubsLoading,
    refetch: refetchSubs,
  } = useReadContracts({
    contracts: subCalls,
  });

  // Extract subscriptions
  const subscriptions: Subscription[] = useMemo(() => {
    if (!subsData) return [];
    return subsData
      .filter((res) => res.status === "success" && res.result)
      .map((res) => {
        const s = res.result as {
          id: bigint;
          planId: bigint;
          subscriber: `0x${string}`;
          amount: bigint;
          startedAt: bigint;
          nextPaymentTime: bigint;
          paymentsMade: bigint;
          active: boolean;
        };
        return {
          id: s.id,
          planId: s.planId,
          subscriber: s.subscriber,
          amount: s.amount,
          startedAt: s.startedAt,
          nextPaymentTime: s.nextPaymentTime,
          paymentsMade: s.paymentsMade,
          active: s.active,
        };
      });
  }, [subsData]);

  // 3. Multicall getPlan for each distinct planId
  const distinctPlanIds = useMemo(() => {
    return Array.from(new Set(subscriptions.map((s) => s.planId)));
  }, [subscriptions]);

  const planCalls = useMemo(() => {
    return distinctPlanIds.map((id) => ({
      address: BOTSTREAM_CONTRACT_ADDRESS,
      abi: BOTSTREAM_ABI,
      functionName: "getPlan" as const,
      args: [id],
    }));
  }, [distinctPlanIds]);

  const { data: plansData } = useReadContracts({
    contracts: planCalls,
  });

  const plansMap = useMemo(() => {
    const map = new Map<string, Plan>();
    if (!plansData) return map;
    plansData.forEach((res) => {
      if (res.status === "success" && res.result) {
        const p = res.result as {
          id: bigint;
          creator: `0x${string}`;
          price: bigint;
          interval: bigint;
          active: boolean;
          metadataURI: string;
          createdAt: bigint;
        };
        map.set(p.id.toString(), {
          id: p.id,
          creator: p.creator,
          price: p.price,
          interval: p.interval,
          active: p.active,
          metadataURI: p.metadataURI,
          createdAt: p.createdAt,
        });
      }
    });
    return map;
  }, [plansData]);

  // Tabs & Filter
  const [activeTab, setActiveTab] = useState<"all" | "active" | "due" | "canceled">("all");

  // Transaction state
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txTitle, setTxTitle] = useState("");
  const [txError, setTxError] = useState("");
  const [actingSubId, setActingSubId] = useState<bigint | null>(null);

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isWritePending) {
      setTxStep("wallet-confirm");
    } else if (isConfirming) {
      setTxStep("pending");
    } else if (isConfirmed) {
      setTxStep("success");
      refetchSubIds();
      refetchSubs();
    }
  }, [isWritePending, isConfirming, isConfirmed, refetchSubIds, refetchSubs]);

  // Action: Renew Subscription
  const handleRenew = (subscriptionId: bigint, amount: bigint) => {
    setActingSubId(subscriptionId);
    setTxTitle("Renew Subscription");
    setTxStep("wallet-confirm");
    setTxError("");

    writeContract(
      {
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        functionName: "renewSubscription",
        args: [subscriptionId],
        value: amount,
      },
      {
        onError: (err) => {
          setTxStep("error");
          setTxError(err.message.includes("User rejected") ? "Transaction rejected by user." : err.message);
        },
      }
    );
  };

  // Action: Cancel Subscription
  const handleCancel = (subscriptionId: bigint) => {
    if (!confirm("Are you sure you want to cancel this subscription? You will retain access until the current cycle expires, but renewals will be disabled.")) {
      return;
    }
    setActingSubId(subscriptionId);
    setTxTitle("Cancel Subscription");
    setTxStep("wallet-confirm");
    setTxError("");

    writeContract(
      {
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        functionName: "cancelSubscription",
        args: [subscriptionId],
      },
      {
        onError: (err) => {
          setTxStep("error");
          setTxError(err.message.includes("User rejected") ? "Transaction rejected by user." : err.message);
        },
      }
    );
  };

  const now = Math.floor(Date.now() / 1000);

  // Compute status counts
  const counts = useMemo(() => {
    let active = 0;
    let due = 0;
    let canceled = 0;

    subscriptions.forEach((sub) => {
      if (!sub.active) {
        canceled++;
      } else if (now >= Number(sub.nextPaymentTime)) {
        due++;
      } else {
        active++;
      }
    });

    return { total: subscriptions.length, active, due, canceled };
  }, [subscriptions, now]);

  // Filter subscriptions based on tab
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      const isDue = sub.active && now >= Number(sub.nextPaymentTime);
      const isCanceled = !sub.active;

      if (activeTab === "active") return sub.active && !isDue;
      if (activeTab === "due") return isDue;
      if (activeTab === "canceled") return isCanceled;
      return true;
    });
  }, [subscriptions, activeTab, now]);

  const isLoading = isSubIdsLoading || isSubsLoading;

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-12 border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Connect your Web3 wallet to view and manage your on-chain active subscriptions, pending renewals, and payment dates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white">Subscriber Dashboard</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your decentralized recurring subscriptions on Botchain Testnet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchSubIds();
              refetchSubs();
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
            title="Refresh subscriptions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/plans"
            className="cyber-button-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Plans</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Subscriptions"
          value={counts.total}
          icon={UserCheck}
          color="cyan"
        />
        <StatCard
          title="Active Tiers"
          value={counts.active}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Renewals Due"
          value={counts.due}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Canceled"
          value={counts.canceled}
          icon={XCircle}
          color="purple"
        />
      </div>

      {/* Notification Banner if Renewals Due */}
      {counts.due > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              <strong className="text-white block font-semibold">
                You have {counts.due} subscription{counts.due > 1 ? "s" : ""} due for renewal!
              </strong>
              <span>Renew with native BOT to ensure uninterrupted access.</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("due")}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-110 shrink-0 cursor-pointer"
          >
            View Due Subscriptions
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: "all", label: "All", count: counts.total },
          { id: "active", label: "Active", count: counts.active },
          { id: "due", label: "Payment Due", count: counts.due },
          { id: "canceled", label: "Canceled", count: counts.canceled },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-white/10 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Subscriptions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 h-80 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-8 border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {subscriptions.length === 0 ? "No Subscriptions Yet" : "No Subscriptions in This Category"}
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {subscriptions.length === 0
              ? "You have not subscribed to any on-chain plans on Botchain Testnet yet."
              : "All subscriptions in other categories are up to date."}
          </p>
          <Link
            href="/plans"
            className="cyber-button-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold"
          >
            <Compass className="w-4 h-4" />
            <span>Browse Plans</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubs.map((sub) => (
            <SubscriptionCard
              key={sub.id.toString()}
              subscription={sub}
              plan={plansMap.get(sub.planId.toString())}
              onRenew={handleRenew}
              onCancel={handleCancel}
              isRenewing={actingSubId === sub.id && (isWritePending || isConfirming)}
              isCanceling={actingSubId === sub.id && (isWritePending || isConfirming)}
            />
          ))}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
          setActingSubId(null);
        }}
        step={txStep}
        title={
          txStep === "wallet-confirm"
            ? txTitle
            : txStep === "pending"
            ? "Broadcasting to Botchain"
            : txStep === "success"
            ? "Transaction Confirmed!"
            : "Transaction Failed"
        }
        txHash={txHash}
        errorMessage={txError}
        actionText="Done"
      />
    </div>
  );
}
