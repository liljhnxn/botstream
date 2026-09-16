"use client";

import React from "react";
import Link from "next/link";
import { Plan } from "@/types";
import { formatBOT, formatInterval } from "@/utils/botns";
import { resolveIdentity } from "@/utils/botns";
import { ShieldCheck, Calendar, ArrowRight, User } from "lucide-react";

interface PlanCardProps {
  plan: Plan;
  onSubscribe?: (plan: Plan) => void;
  isSubscribing?: boolean;
}

export function PlanCard({ plan, onSubscribe, isSubscribing }: PlanCardProps) {
  const creatorIdentity = resolveIdentity(plan.creator);

  // Parse metadata if formatted as JSON
  let title = `Plan #${plan.id.toString()}`;
  let description = "Decentralized subscription tier on BotStream.";
  let category = "General";
  let perks: string[] = [];

  if (plan.metadataURI) {
    try {
      if (plan.metadataURI.startsWith("{") && plan.metadataURI.endsWith("}")) {
        const parsed = JSON.parse(plan.metadataURI);
        if (parsed.name) title = parsed.name;
        if (parsed.description) description = parsed.description;
        if (parsed.category) category = parsed.category;
        if (Array.isArray(parsed.perks)) perks = parsed.perks;
      } else if (plan.metadataURI.startsWith("ipfs://") || plan.metadataURI.startsWith("http")) {
        // Fallback for URIs
        title = `Tier #${plan.id.toString()}`;
      }
    } catch {
      // Fallback
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative group border border-white/10 hover:border-cyan-500/40 transition-all">
      {/* Top badges */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
          {category}
        </span>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
            plan.active
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-slate-700/50 text-slate-400 border-slate-600"
          }`}
        >
          {plan.active ? "Active" : "Archived"}
        </span>
      </div>

      {/* Plan Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
          {title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
          {description}
        </p>
      </div>

      {/* Creator Info */}
      <div className="flex items-center gap-2 mb-5 py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5">
        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          <User className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs">
          <span className="text-slate-400">By </span>
          <span className="text-slate-200 font-mono font-medium">{creatorIdentity.name}</span>
        </div>
      </div>

      {/* Perks preview if available */}
      {perks.length > 0 && (
        <ul className="mb-5 space-y-1.5 text-xs text-slate-300">
          {perks.slice(0, 3).map((perk, i) => (
            <li key={i} className="flex items-center gap-2 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{perk}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Price and Billing Interval */}
      <div className="pt-4 border-t border-white/10 flex items-baseline justify-between mb-5">
        <div>
          <span className="text-2xl font-black text-white tracking-tight">
            {formatBOT(plan.price)}
          </span>
          <span className="text-xs font-bold text-cyan-400 ml-1">BOT</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Every {formatInterval(plan.interval)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/plans/${plan.id.toString()}`}
          className="cyber-button-secondary py-2.5 px-3 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1"
        >
          <span>Details</span>
          <ArrowRight className="w-3 h-3" />
        </Link>

        <button
          onClick={() => onSubscribe && onSubscribe(plan)}
          disabled={!plan.active || isSubscribing}
          className={`py-2.5 px-3 rounded-xl text-center text-xs font-semibold cursor-pointer transition-all ${
            plan.active
              ? "cyber-button-primary"
              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
          }`}
        >
          {isSubscribing ? "Subscribing..." : plan.active ? "Subscribe" : "Closed"}
        </button>
      </div>
    </div>
  );
}
