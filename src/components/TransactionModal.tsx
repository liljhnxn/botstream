"use client";

import React from "react";
import { CheckCircle2, XCircle, Loader2, ExternalLink, X } from "lucide-react";

export type TxStep = "idle" | "wallet-confirm" | "pending" | "success" | "error";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: TxStep;
  title: string;
  txHash?: `0x${string}` | string;
  errorMessage?: string;
  actionText?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  step,
  title,
  txHash,
  errorMessage,
  actionText = "Continue",
}: TransactionModalProps) {
  if (!isOpen || step === "idle") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-dropdown rounded-3xl p-6 border border-white/15 shadow-2xl">
        {/* Close button (only allowed when completed or error) */}
        {(step === "success" || step === "error") && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center pt-2 pb-4">
          {/* Status Icon Animation */}
          {step === "wallet-confirm" && (
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          )}

          {step === "pending" && (
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}

          {step === "success" && (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
          )}

          {step === "error" && (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-rose-400" />
            </div>
          )}

          {/* Heading */}
          <h3 className="text-xl font-bold text-white mb-1">{title}</h3>

          {/* Subtext description */}
          <p className="text-sm text-slate-300 max-w-xs mb-4">
            {step === "wallet-confirm" && "Please review and confirm the transaction in your wallet."}
            {step === "pending" && "Transaction submitted to Botchain Testnet. Waiting for block confirmation..."}
            {step === "success" && "Transaction successfully confirmed on Botchain!"}
            {step === "error" && (errorMessage || "The transaction was rejected or encountered an on-chain error.")}
          </p>

          {/* Transaction Hash & Explorer Link */}
          {txHash && (
            <div className="w-full bg-slate-900/80 rounded-xl p-3 border border-white/5 mb-5 text-left">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">Transaction Hash</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-cyan-300 truncate">{txHash}</span>
                <a
                  href={`https://scan.bohr.life/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 shrink-0 underline"
                >
                  <span>BohrScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Action button */}
          {(step === "success" || step === "error") && (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all cyber-button-primary"
            >
              {actionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
