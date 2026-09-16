"use client";

import React from "react";
import Link from "next/link";
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BOTSTREAM_CONTRACT_ADDRESS, BOTSTREAM_ABI } from "@/config/contracts";
import { Plan } from "@/types";
import { PlanCard } from "@/components/PlanCard";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  Layers,
  Sparkles,
  Lock,
  Wallet,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const { isConnected } = useAccount();

  // Read total plan count
  const { data: planCountData, refetch: refetchCount } = useReadContract({
    address: BOTSTREAM_CONTRACT_ADDRESS,
    abi: BOTSTREAM_ABI,
    functionName: "getPlanCount",
  });

  const planCount = planCountData ? Number(planCountData) : 0;

  // Transaction states for subscribing
  const [txStep, setTxStep] = React.useState<TxStep>("idle");
  const [txError, setTxError] = React.useState<string>("");
  const [subscribingPlan, setSubscribingPlan] = React.useState<Plan | null>(null);

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  React.useEffect(() => {
    if (isWritePending) {
      setTxStep("wallet-confirm");
    } else if (isConfirming) {
      setTxStep("pending");
    } else if (isConfirmed) {
      setTxStep("success");
      refetchCount();
    }
  }, [isWritePending, isConfirming, isConfirmed, refetchCount]);

  const handleSubscribe = (plan: Plan) => {
    if (!isConnected) {
      alert("Please connect your wallet first to subscribe.");
      return;
    }
    setSubscribingPlan(plan);
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

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 text-center">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-semibold text-cyan-300 mb-8 backdrop-blur-md shadow-lg shadow-cyan-500/10">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Decentralized Subscriptions Powered by Botchain Testnet</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Subscribe. Renew.{" "}
          <span className="gradient-text block mt-1">On-Chain.</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Empowering Web3 creators and SaaS protocols to establish recurring crypto memberships. Direct creator payouts in native BOT with transparent subscriber billing cycles.
        </p>

        {/* Clear Notice Box on Native BOT Renewal */}
        <div className="mt-8 max-w-xl mx-auto p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200/90 backdrop-blur-md flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-300">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-white block font-semibold">100% Non-Custodial & Transparent</strong>
            <span>Because native BOT cannot be pulled automatically, renewals require your direct wallet signature when due.</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/plans"
            className="cyber-button-primary w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 cursor-pointer"
          >
            <span>Explore Plans</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/create"
            className="cyber-button-secondary w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create a Plan</span>
          </Link>
        </div>

        {/* Protocol Live Counter Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="glass-panel p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium block">Total Tiers Registered</span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{planCount}</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium block">Billing Currency</span>
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">Native BOT</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium block">Chain ID</span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">968 (Botchain)</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium block">Settlement Model</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">Direct Escrow</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">Simple 3-Step Flow</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">How BotStream Works</h2>
          <p className="text-sm text-slate-400 mt-3">
            A frictionless subscription architecture designed specifically for decentralized networks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card rounded-3xl p-8 relative border border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold block mb-1">STEP 01</span>
            <h3 className="text-xl font-bold text-white mb-2">1. Subscribe & Fund</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your Web3 wallet and select a subscription plan. Pay the initial cycle fee in native BOT to instantly activate your membership tier.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-8 relative border border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
              <RefreshCw className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-indigo-400 font-bold block mb-1">STEP 02</span>
            <h3 className="text-xl font-bold text-white mb-2">2. Track & Renew</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Monitor active countdowns on your dashboard. When the billing interval ends, confirm a renewal transaction to maintain uninterrupted service.
            </p>
          </div>

          <div className="glass-card rounded-3xl p-8 relative border border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold block mb-1">STEP 03</span>
            <h3 className="text-xl font-bold text-white mb-2">3. Creator Payouts</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Creators immediately accumulate revenue in isolated escrow accounting. Withdraw 100% of earned BOT at any time without platform intermediaries.
            </p>
          </div>
        </div>
      </section>

      {/* For Creators & For Subscribers Dual Section */}
      <section className="py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Creators */}
          <div className="glass-card rounded-3xl p-8 border border-cyan-500/30 bg-gradient-to-br from-[#0c142c] to-[#080d1e]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-bold border border-cyan-500/20 mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>For Creators & Protocols</span>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">Monetize Your Services with On-Chain Predictability</h3>
            <ul className="space-y-3 text-xs text-slate-300 mb-6">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Establish custom intervals: weekly, 30 days, quarterly, or annual tiers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Zero custodial holding: withdraw earned BOT whenever you desire.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Deactivate or reactivate plans without breaking existing subscriber contracts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>BotNS compatible: ready to display your verified .bot creator brand.</span>
              </li>
            </ul>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Launch a Creator Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* For Subscribers */}
          <div className="glass-card rounded-3xl p-8 border border-purple-500/30 bg-gradient-to-br from-[#120f2e] to-[#09071a]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-bold border border-purple-500/20 mb-4">
              <Wallet className="w-3.5 h-3.5" />
              <span>For Subscribers</span>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">Absolute Authority Over Your Crypto Wallet</h3>
            <ul className="space-y-3 text-xs text-slate-300 mb-6">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>No silent automated drains: every renewal is signed by you directly.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>One-click cancellation with instantaneous on-chain confirmation.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Comprehensive dashboard displaying payment countdowns and past cycle history.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Fair late-renewal grace: renewal interval extends from current payment time.</span>
              </li>
            </ul>
            <Link
              href="/dashboard/subscriptions"
              className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>View My Subscriptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Network Information Banner */}
      <section className="glass-panel rounded-3xl p-8 sm:p-10 border border-white/10 text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-4">
          <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">Infrastructure</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Botchain Testnet Native</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            BotStream is built on Bohr / Botchain Testnet (Chain ID 968) using EVM Solidity ^0.8.24 and OpenZeppelin security contracts.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-mono text-cyan-300 border border-slate-700">
              RPC: https://rpc.bohr.life
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-mono text-cyan-300 border border-slate-700">
              Chain ID: 968
            </span>
            <a
              href="https://scan.bohr.life"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-cyan-950 text-xs font-mono text-cyan-400 hover:text-cyan-300 border border-cyan-800 transition-colors"
            >
              Explorer: scan.bohr.life
            </a>
          </div>
        </div>
      </section>

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
            ? "Confirm Subscription"
            : txStep === "pending"
            ? "Broadcasting Subscription"
            : txStep === "success"
            ? "Subscription Activated!"
            : "Subscription Failed"
        }
        txHash={txHash}
        errorMessage={txError}
        actionText="Done"
      />
    </div>
  );
}
