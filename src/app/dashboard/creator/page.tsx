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
import { Plan } from "@/types";
import { formatBOT, formatInterval } from "@/utils/botns";
import { StatCard } from "@/components/StatCard";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { BackButton } from "@/components/BackButton";
import {
  Layers,
  PlusCircle,
  Coins,
  ArrowDownToLine,
  RefreshCw,
  Power,
  Calendar,
  CheckCircle,
  ExternalLink,
  Wallet,
  ShieldAlert,
} from "lucide-react";

export default function CreatorDashboardPage() {
  const { address, isConnected } = useAccount();

  // 1. Fetch creator plan IDs
  const {
    data: creatorPlanIdsData,
    isLoading: isPlanIdsLoading,
    refetch: refetchPlanIds,
  } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getCreatorPlans",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const planIds = (creatorPlanIdsData as bigint[]) || [];

  // 2. Multicall getPlan for each creator plan ID
  const planCalls = useMemo(() => {
    return planIds.map((id) => ({
      address: BOTSTREAM_CONTRACT_ADDRESS,
      abi: BOTSTREAM_ABI,
      functionName: "getPlan" as const,
      args: [id],
    }));
  }, [planIds]);

  const {
    data: plansData,
    isLoading: isPlansLoading,
    refetch: refetchPlans,
  } = useReadContracts({
    contracts: planCalls,
  });

  // Extract creator plans
  const plans: Plan[] = useMemo(() => {
    if (!plansData) return [];
    return plansData
      .filter((res) => res.status === "success" && res.result)
      .map((res) => {
        const p = res.result as {
          id: bigint;
          creator: `0x${string}`;
          price: bigint;
          interval: bigint;
          active: boolean;
          metadataURI: string;
          createdAt: bigint;
        };
        return {
          id: p.id,
          creator: p.creator,
          price: p.price,
          interval: p.interval,
          active: p.active,
          metadataURI: p.metadataURI,
          createdAt: p.createdAt,
        };
      });
  }, [plansData]);

  // 3. Fetch creator pending earnings
  const {
    data: pendingEarningsData,
    isLoading: isEarningsLoading,
    refetch: refetchEarnings,
  } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getCreatorEarnings",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const pendingEarnings = (pendingEarningsData as bigint) || 0n;

  // Transaction state
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txTitle, setTxTitle] = useState("");
  const [txError, setTxError] = useState("");

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
      refetchPlanIds();
      refetchPlans();
      refetchEarnings();
    }
  }, [isWritePending, isConfirming, isConfirmed, refetchPlanIds, refetchPlans, refetchEarnings]);

  // Action: Withdraw Earnings
  const handleWithdraw = () => {
    if (pendingEarnings <= 0n) {
      alert("No pending earnings to withdraw.");
      return;
    }

    setTxTitle("Withdraw Earnings");
    setTxStep("wallet-confirm");
    setTxError("");

    writeContract(
      {
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        functionName: "withdrawEarnings",
      },
      {
        onError: (err) => {
          setTxStep("error");
          setTxError(err.message.includes("User rejected") ? "Transaction rejected by user." : err.message);
        },
      }
    );
  };

  // Action: Toggle Plan Status
  const handleToggleStatus = (planId: bigint, currentActive: boolean) => {
    setTxTitle(currentActive ? "Deactivate Plan" : "Reactivate Plan");
    setTxStep("wallet-confirm");
    setTxError("");

    writeContract(
      {
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        functionName: "setPlanStatus",
        args: [planId, !currentActive],
      },
      {
        onError: (err) => {
          setTxStep("error");
          setTxError(err.message.includes("User rejected") ? "Transaction rejected by user." : err.message);
        },
      }
    );
  };

  const activePlansCount = plans.filter((p) => p.active).length;
  const isLoading = isPlanIdsLoading || isPlansLoading || isEarningsLoading;

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-12 border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Creator Wallet</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Connect the wallet you used to create subscription plans to manage tiers and withdraw pending BOT earnings.
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
            <Layers className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white">Creator Studio</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor plan metrics, manage availability, and withdraw accumulated subscription revenue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchPlanIds();
              refetchPlans();
              refetchEarnings();
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
            title="Refresh creator data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/create"
            className="cyber-button-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Plan</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Plans Created"
          value={plans.length}
          subvalue={`${activePlansCount} currently active`}
          icon={Layers}
          color="cyan"
        />

        <StatCard
          title="Active Tiers"
          value={activePlansCount}
          subvalue="Accepting new subscriptions"
          icon={CheckCircle}
          color="emerald"
        />

        {/* Withdrawal Card */}
        <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between border border-cyan-500/30 bg-gradient-to-br from-[#0c1b3b] to-[#081226]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cyan-300">Pending Withdrawals</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white font-mono">{formatBOT(pendingEarnings)}</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">BOT</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Direct non-reentrant contract payout.</p>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={pendingEarnings <= 0n || isWritePending || isConfirming}
            className={`mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              pendingEarnings > 0n
                ? "cyber-button-primary shadow-lg shadow-cyan-500/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>
              {isWritePending || isConfirming
                ? "Processing Payout..."
                : pendingEarnings > 0n
                ? `Withdraw ${formatBOT(pendingEarnings)} BOT`
                : "No Funds to Withdraw"}
            </span>
          </button>
        </div>
      </div>

      {/* Plans Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Your Subscription Plans</h2>
          <span className="text-xs text-slate-400">{plans.length} total tiers</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 h-24 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-6 border border-white/10">
            <Layers className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Plans Created Yet</h3>
            <p className="text-xs text-slate-400 mb-6">
              Launch your first on-chain recurring subscription tier to begin earning native BOT.
            </p>
            <Link
              href="/create"
              className="cyber-button-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Plan</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              let planName = `Plan #${plan.id.toString()}`;
              let planDescription = "On-chain recurring subscription tier.";
              if (plan.metadataURI) {
                try {
                  const parsed = JSON.parse(plan.metadataURI);
                  if (parsed.name) planName = parsed.name;
                  if (parsed.description) planDescription = parsed.description;
                } catch {
                  // fallback
                }
              }

              return (
                <div
                  key={plan.id.toString()}
                  className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{planName}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            plan.active
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-slate-700/50 text-slate-400 border-slate-600"
                          }`}
                        >
                          {plan.active ? "Active" : "Deactivated"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{planDescription}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                        <span>Price: <strong className="text-white">{formatBOT(plan.price)} BOT</strong></span>
                        <span>Interval: <strong className="text-white">{formatInterval(plan.interval)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/plans/${plan.id.toString()}`}
                      className="cyber-button-secondary px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => handleToggleStatus(plan.id, plan.active)}
                      disabled={isWritePending || isConfirming}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        plan.active
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{plan.active ? "Deactivate" : "Reactivate"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
        }}
        step={txStep}
        title={
          txStep === "wallet-confirm"
            ? txTitle
            : txStep === "pending"
            ? "Executing on Botchain"
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
