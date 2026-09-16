"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BOTSTREAM_CONTRACT_ADDRESS, BOTSTREAM_ABI } from "@/config/contracts";
import { Plan } from "@/types";
import { PlanCard } from "@/components/PlanCard";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { Search, Filter, PlusCircle, Compass, RefreshCw } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export default function ExplorePlansPage() {
  const { isConnected } = useAccount();

  // 1. Get total plan count
  const { data: planCountData, isLoading: isCountLoading, refetch: refetchCount } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getPlanCount",
  });

  const planCount = planCountData ? Number(planCountData) : 0;

  // 2. Prepare contract call queries for all existing plan IDs (1 to planCount)
  const planCalls = React.useMemo(() => {
    if (planCount === 0) return [];
    return Array.from({ length: planCount }, (_, i) => ({
      address: BOTSTREAM_CONTRACT_ADDRESS,
      abi: BOTSTREAM_ABI,
      functionName: "getPlan" as const,
      args: [BigInt(i + 1)],
    }));
  }, [planCount]);

  const { data: plansData, isLoading: isPlansLoading, refetch: refetchPlans } = useReadContracts({
    contracts: planCalls,
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  // Subscribe transaction flow
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txError, setTxError] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

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
      refetchCount();
      refetchPlans();
    }
  }, [isWritePending, isConfirming, isConfirmed, refetchCount, refetchPlans]);

  const handleSubscribe = (plan: Plan) => {
    if (!isConnected) {
      alert("Please connect your wallet first to subscribe.");
      return;
    }
    setSelectedPlan(plan);
    setTxStep("wallet-confirm");
    setTxError("");

    writeContract(
      {
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        functionName: "subscribe",
        args: [plan.id],
        value: plan.price,
      },
      {
        onError: (err) => {
          setTxStep("error");
          setTxError(err.message.includes("User rejected") ? "Transaction rejected by user." : err.message);
        },
      }
    );
  };

  // Format retrieved plans
  const plans: Plan[] = React.useMemo(() => {
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

  // Filter plans based on search & active status
  const filteredPlans = plans.filter((plan) => {
    if (filterActiveOnly && !plan.active) return false;
    if (searchQuery.trim() === "") return true;

    const query = searchQuery.toLowerCase();
    const matchesCreator = plan.creator.toLowerCase().includes(query);
    const matchesMetadata = plan.metadataURI.toLowerCase().includes(query);
    const matchesId = plan.id.toString() === query;

    return matchesCreator || matchesMetadata || matchesId;
  });

  const isLoading = isCountLoading || isPlansLoading;

  return (
    <div className="space-y-6">
      <BackButton />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white">Explore Subscription Plans</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse on-chain subscription tiers deployed directly to Botchain Testnet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchCount();
              refetchPlans();
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
            title="Refresh on-chain plans"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/create"
            className="cyber-button-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Plan</span>
          </Link>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by creator address, plan name, or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
          />
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
              filterActiveOnly
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Active Plans Only</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 h-80 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-12 border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {planCount === 0 ? "No Plans Created Yet" : "No Matching Plans Found"}
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {planCount === 0
              ? "Be the first creator to launch an on-chain recurring subscription tier on Botchain Testnet!"
              : "Try adjusting your search criteria or toggling active plan filters."}
          </p>
          <Link
            href="/create"
            className="cyber-button-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create the First Plan</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id.toString()}
              plan={plan}
              onSubscribe={handleSubscribe}
              isSubscribing={selectedPlan?.id === plan.id && (isWritePending || isConfirming)}
            />
          ))}
        </div>
      )}

      {/* Transaction Feedback Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
        }}
        step={txStep}
        title={
          txStep === "wallet-confirm"
            ? "Confirm Subscription"
            : txStep === "pending"
            ? "Submitting Subscription"
            : txStep === "success"
            ? "Subscription Activated!"
            : "Subscription Failed"
        }
        txHash={txHash}
        errorMessage={txError}
        actionText="View My Subscriptions"
      />
    </div>
  );
}
