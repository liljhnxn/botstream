"use client";

import React from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { botchainTestnet } from "@/config/chains";
import { AlertTriangle, Info } from "lucide-react";

export function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== botchainTestnet.id;

  if (isWrongNetwork) {
    return (
      <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-center text-xs sm:text-sm text-rose-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>You are connected to an unsupported network. Please switch to <strong>Botchain Testnet (Chain ID 968)</strong> to use BotStream.</span>
          </div>
          <button
            onClick={() => switchChain({ chainId: botchainTestnet.id })}
            disabled={isPending}
            className="px-3 py-1 bg-rose-500 text-white rounded-md text-xs font-semibold hover:bg-rose-600 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Switching..." : "Switch Network"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-indigo-950/40 border-b border-indigo-500/15 px-4 py-1.5 text-center text-xs text-indigo-300/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>
          <strong>On-Chain Notice:</strong> Native BOT subscriptions require explicit wallet confirmation on renewal. Payments are never automatically debited without your signature.
        </span>
      </div>
    </div>
  );
}
