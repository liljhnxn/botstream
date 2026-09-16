"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BOTSTREAM_CONTRACT_ADDRESS, BOTSTREAM_ABI } from "@/config/contracts";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { PlusCircle, Sparkles, AlertCircle, Check, ArrowRight, Shield } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export default function CreatePlanPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Developer Tools");
  const [priceBOT, setPriceBOT] = useState("5.0");
  const [intervalDays, setIntervalDays] = useState(30);
  const [customDays, setCustomDays] = useState("");
  const [perkInput, setPerkInput] = useState("");
  const [perks, setPerks] = useState<string[]>([
    "Direct API Endpoint Access",
    "Priority Discord Support",
  ]);

  // Transaction States
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txError, setTxError] = useState<string>("");
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);

  const {
    data: txHash,
    writeContract,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isWritePending) {
      setTxStep("wallet-confirm");
    } else if (isConfirming) {
      setTxStep("pending");
    } else if (isConfirmed) {
      setTxStep("success");
      // Try to parse the created plan ID from logs if available
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        try {
          // The first topic is PlanCreated, topic[1] is planId
          const planTopic = receipt.logs[0].topics[1];
          if (planTopic) {
            setCreatedPlanId(BigInt(planTopic).toString());
          }
        } catch {
          // fallback
        }
      }
    }
  }, [isWritePending, isConfirming, isConfirmed, receipt]);

  const handleAddPerk = (e: React.FormEvent) => {
    e.preventDefault();
    if (perkInput.trim()) {
      setPerks([...perks, perkInput.trim()]);
      setPerkInput("");
    }
  };

  const handleRemovePerk = (index: number) => {
    setPerks(perks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    const priceNum = parseFloat(priceBOT);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Price must be a valid number greater than 0 BOT.");
      return;
    }

    const finalDays = customDays ? parseInt(customDays, 10) : intervalDays;
    if (isNaN(finalDays) || finalDays <= 0) {
      alert("Billing interval must be at least 1 day.");
      return;
    }

    if (!name.trim()) {
      alert("Plan name is required.");
      return;
    }

    // Interval in seconds
    const intervalSeconds = BigInt(finalDays * 86400);
    const priceWei = parseEther(priceBOT.trim());

    // Generate JSON Metadata
    const metadataObj = {
      name: name.trim(),
      description: description.trim() || "On-chain subscription tier.",
      category,
      perks,
      creator: address,
      createdAt: Math.floor(Date.now() / 1000),
    };
    const metadataURI = JSON.stringify(metadataObj);

    setTxStep("wallet-confirm");
    setTxError("");

    writeContract(
      {
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        functionName: "createPlan",
        args: [priceWei, intervalSeconds, metadataURI],
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
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton />

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Creator Studio</span>
        </div>
        <h1 className="text-3xl font-black text-white">Create a Subscription Plan</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Deploy an on-chain recurring tier on Botchain. Earnings flow directly to your escrow balance in native BOT.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 border border-white/10 space-y-6">
        {/* Plan Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Plan Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Premium API Tier, DAO Contributor Pass, Pro Signals"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what subscribers receive, perks, access keys, or community channels..."
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
          />
        </div>

        {/* Pricing & Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Price */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Price per Cycle (Native BOT) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={priceBOT}
                onChange={(e) => setPriceBOT(e.target.value)}
                placeholder="5.0"
                className="w-full pl-4 pr-14 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-cyan-400/60"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 font-mono">
                BOT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Paid directly by subscribers on each cycle.</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/60"
            >
              <option value="Developer Tools">Developer Tools / API</option>
              <option value="DAO Membership">DAO & Community</option>
              <option value="SaaS & Software">Web3 SaaS</option>
              <option value="Trading Signals">Trading & Analytics</option>
              <option value="Exclusive Content">Creator & Media</option>
            </select>
          </div>
        </div>

        {/* Billing Interval Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Billing Interval <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            {[
              { days: 7, label: "Weekly (7 Days)" },
              { days: 30, label: "Monthly (30 Days)" },
              { days: 90, label: "Quarterly (90 Days)" },
              { days: 365, label: "Yearly (365 Days)" },
            ].map((preset) => (
              <button
                type="button"
                key={preset.days}
                onClick={() => {
                  setIntervalDays(preset.days);
                  setCustomDays("");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  intervalDays === preset.days && !customDays
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Or Custom Days:</span>
            <input
              type="number"
              min="1"
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setIntervalDays(0);
              }}
              placeholder="e.g. 14"
              className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <span className="text-xs text-slate-400">days</span>
          </div>
        </div>

        {/* Included Perks / Features */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Tier Perks & Benefits
          </label>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={perkInput}
              onChange={(e) => setPerkInput(e.target.value)}
              placeholder="e.g. 100,000 monthly API calls"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
            />
            <button
              type="button"
              onClick={handleAddPerk}
              className="cyber-button-secondary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
            >
              Add Perk
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {perks.map((perk, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/20 text-xs text-cyan-200"
              >
                <span>{perk}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePerk(i)}
                  className="text-cyan-400 hover:text-rose-400 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Security & Non-Custodial Assurance */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white block font-semibold">Decentralized Escrow Architecture:</strong>
            Subscribers pay {priceBOT} BOT directly to your creator balance upon registration and each renewal cycle. You can withdraw your earnings anytime via the Creator Studio.
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isConnected || isWritePending || isConfirming}
          className="cyber-button-primary w-full py-4 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-cyan-500/20 disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          <span>
            {isWritePending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Submitting to Botchain..."
              : "Deploy Plan on Botchain"}
          </span>
        </button>
      </form>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
          if (txStep === "success") {
            router.push("/dashboard/creator");
          }
        }}
        step={txStep}
        title={
          txStep === "wallet-confirm"
            ? "Confirm Plan Creation"
            : txStep === "pending"
            ? "Deploying Plan to Botchain"
            : txStep === "success"
            ? "Plan Created Successfully!"
            : "Plan Creation Failed"
        }
        txHash={txHash}
        errorMessage={txError}
        actionText="Go to Creator Studio"
      />
    </div>
  );
}
