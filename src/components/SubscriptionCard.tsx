"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Subscription, Plan, SubscriptionStatus } from "@/types";
import { formatBOT, formatInterval, resolveIdentity } from "@/utils/botns";
import { Calendar, RefreshCw, XCircle, AlertCircle, CheckCircle, Clock, ExternalLink } from "lucide-react";

interface SubscriptionCardProps {
  subscription: Subscription;
  plan?: Plan;
  onRenew: (subscriptionId: bigint, amount: bigint) => void;
  onCancel: (subscriptionId: bigint) => void;
  isRenewing?: boolean;
  isCanceling?: boolean;
}

export function SubscriptionCard({
  subscription,
  plan,
  onRenew,
  onCancel,
  isRenewing,
  isCanceling,
}: SubscriptionCardProps) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nextPaymentSec = Number(subscription.nextPaymentTime);
  const isDue = subscription.active && now >= nextPaymentSec;
  const isCanceled = !subscription.active;

  // Derive status
  const status = isCanceled
    ? SubscriptionStatus.CANCELED
    : isDue
    ? SubscriptionStatus.PAYMENT_DUE
    : SubscriptionStatus.ACTIVE;

  // Calculate countdown / remaining time
  const remainingSec = Math.max(0, nextPaymentSec - now);
  const remainingDays = Math.floor(remainingSec / 86400);
  const remainingHours = Math.floor((remainingSec % 86400) / 3600);
  const remainingMins = Math.floor((remainingSec % 3600) / 60);
  const remainingSeconds = remainingSec % 60;

  // Plan details
  let planTitle = `Plan #${subscription.planId.toString()}`;
  let creatorAddress = plan?.creator || "0x0000000000000000000000000000000000000000";
  if (plan?.metadataURI) {
    try {
      const parsed = JSON.parse(plan.metadataURI);
      if (parsed.name) planTitle = parsed.name;
    } catch {
      // fallback
    }
  }

  const creatorIdentity = resolveIdentity(creatorAddress);

  const nextPaymentDate = new Date(nextPaymentSec * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`glass-card rounded-2xl p-6 relative flex flex-col justify-between border transition-all ${
        isDue
          ? "border-amber-500/50 bg-amber-950/10 shadow-lg shadow-amber-500/5"
          : isCanceled
          ? "border-slate-800/80 opacity-75"
          : "border-cyan-500/30"
      }`}
    >
      <div>
        {/* Status Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-slate-400">
            Subscription #{subscription.id.toString()}
          </span>

          {status === SubscriptionStatus.ACTIVE && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ACTIVE</span>
            </div>
          )}

          {status === SubscriptionStatus.PAYMENT_DUE && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>PAYMENT DUE</span>
            </div>
          )}

          {status === SubscriptionStatus.CANCELED && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold">
              <XCircle className="w-3.5 h-3.5" />
              <span>CANCELED</span>
            </div>
          )}
        </div>

        {/* Plan & Creator */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white tracking-tight">{planTitle}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Creator: <span className="font-mono text-slate-300">{creatorIdentity.name}</span>
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Price / Cycle</span>
            <span className="font-bold text-white font-mono text-sm">
              {formatBOT(subscription.amount)} BOT
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Billing Interval</span>
            <span className="font-medium text-slate-200">
              {plan ? formatInterval(plan.interval) : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Cycles Paid</span>
            <span className="font-bold text-cyan-300 font-mono">
              {subscription.paymentsMade.toString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Next Renewal Date</span>
            <span className="text-slate-300 text-[11px] font-mono leading-tight block">
              {nextPaymentDate}
            </span>
          </div>
        </div>

        {/* Countdown / Status Banner */}
        <div className="mb-5">
          {status === SubscriptionStatus.ACTIVE && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Next payment in:{" "}
                <strong className="font-mono text-white">
                  {remainingDays > 0 ? `${remainingDays}d ` : ""}
                  {remainingHours}h {remainingMins}m {remainingSeconds}s
                </strong>
              </span>
            </div>
          )}

          {status === SubscriptionStatus.PAYMENT_DUE && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Renewal Required to Maintain Access</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Billing interval has elapsed. Please confirm in your wallet to extend for another cycle.
              </p>
            </div>
          )}

          {status === SubscriptionStatus.CANCELED && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              Subscription canceled. No further renewals can be made.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
        {status === SubscriptionStatus.PAYMENT_DUE && (
          <button
            onClick={() => onRenew(subscription.id, subscription.amount)}
            disabled={isRenewing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRenewing ? "animate-spin" : ""}`} />
            <span>{isRenewing ? "Renewing..." : `Renew Now (${formatBOT(subscription.amount)} BOT)`}</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          {plan && (
            <Link
              href={`/plans/${subscription.planId.toString()}`}
              className="flex-1 cyber-button-secondary py-2 px-3 rounded-xl text-center text-xs font-medium"
            >
              View Plan
            </Link>
          )}

          {status !== SubscriptionStatus.CANCELED && (
            <button
              onClick={() => onCancel(subscription.id)}
              disabled={isCanceling}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCanceling ? "Canceling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
