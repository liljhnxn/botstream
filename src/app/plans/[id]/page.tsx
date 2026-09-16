"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useReadContract,
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { BOTSTREAM_CONTRACT_ADDRESS, BOTSTREAM_ABI } from "@/config/contracts";
import { formatBOT, formatInterval, resolveIdentity } from "@/utils/botns";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import {
  ArrowLeft,
  Calendar,
  ShieldCheck,
  User,
  ExternalLink,
  Coins,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = BigInt(params.id as string);
  const { address, isConnected } = useAccount();

  // Read Plan
  const { data: planData, isLoading: isPlanLoading, refetch: refetchPlan } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getPlan",
    args: [planId],
  });

  // Read user's subscriptions to detect if already subscribed
  const { data: userSubIds } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getSubscriberSubscriptions",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Transaction flow
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txError, setTxError] = useState<string>("");

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
      refetchPlan();
    }
  }, [isWritePending, isConfirming, isConfirmed, refetchPlan]);

  if (isPlanLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="glass-card rounded-3xl p-8 h-96 animate-pulse bg-white/5" />
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Plan Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">Plan #{planId.toString()} does not exist on Botchain Testnet.</p>
        <Link href="/plans" className="cyber-button-primary px-6 py-2.5 rounded-xl text-xs font-semibold">
          Return to Explore
        </Link>
      </div>
    );
  }

  const plan = {
    id: planData.id,
    creator: planData.creator,
    price: planData.price,
    interval: planData.interval,
    active: planData.active,
    metadataURI: planData.metadataURI,
    createdAt: planData.createdAt,
  };

  const creatorIdentity = resolveIdentity(plan.creator);

  let title = `Plan #${plan.id.toString()}`;
  let description = "Decentralized on-chain recurring subscription tier.";
  let perks: string[] = [];
  let category = "General";

  if (plan.metadataURI) {
    try {
      if (plan.metadataURI.startsWith("{") && plan.metadataURI.endsWith("}")) {
        const parsed = JSON.parse(plan.metadataURI);
        if (parsed.name) title = parsed.name;
        if (parsed.description) description = parsed.description;
        if (parsed.category) category = parsed.category;
        if (Array.isArray(parsed.perks)) perks = parsed.perks;
      }
    } catch {
      // fallback
    }
  }

  const handleSubscribe = () => {
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

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

  const createdDate = new Date(Number(plan.createdAt) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <BackButton href="/" label="Home" />
        <BackButton href="/plans" label="Explore Plans" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-8 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
              {category}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                plan.active
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-700/50 text-slate-400 border-slate-600"
              }`}
            >
              {plan.active ? "Active Tier" : "Inactive Tier"}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black text-white">{title}</h1>
            <p className="text-xs text-slate-400 mt-1">Tier ID: #{plan.id.toString()}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">About this subscription</span>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{description}</p>
          </div>

          {perks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Included Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator Information */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Creator Profile</h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{creatorIdentity.name}</span>
                  <span className="text-[11px] font-mono text-slate-400">{plan.creator}</span>
                </div>
              </div>

              <a
                href={`https://scan.bohr.life/address/${plan.creator}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                title="View Creator on BohrScan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Subscribe Checkout Column */}
        <div className="glass-card rounded-3xl p-8 border border-white/10 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <span className="text-xs text-slate-400 font-medium block mb-1">Price per Billing Cycle</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-white font-mono">{formatBOT(plan.price)}</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">BOT</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Cycle Interval</span>
                </span>
                <span className="font-semibold text-white">{formatInterval(plan.interval)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Network</span>
                <span className="font-mono text-cyan-400">Botchain (968)</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Plan Created</span>
                <span className="text-slate-200">{createdDate}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-200 leading-relaxed">
              <strong>Transparent Renewal:</strong> When the {formatInterval(plan.interval)} period concludes, you will confirm a manual transaction to extend service. No surprise charges.
            </div>
          </div>

          <div>
            <button
              onClick={handleSubscribe}
              disabled={!plan.active || isWritePending || isConfirming}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                plan.active
                  ? "cyber-button-primary shadow-lg shadow-cyan-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              }`}
            >
              {isWritePending || isConfirming
                ? "Processing..."
                : plan.active
                ? `Subscribe for ${formatBOT(plan.price)} BOT`
                : "Plan Closed to New Subscribers"}
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
          if (txStep === "success") {
            router.push("/dashboard/subscriptions");
          }
        }}
        step={txStep}
        title={
          txStep === "wallet-confirm"
            ? "Authorize Subscription"
            : txStep === "pending"
            ? "Activating Subscription"
            : txStep === "success"
            ? "Subscription Activated!"
            : "Subscription Failed"
        }
        txHash={txHash}
        errorMessage={txError}
        actionText="Go to My Subscriptions"
      />
    </div>
  );
}
