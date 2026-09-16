"use client";

import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { botchainTestnet } from "@/config/chains";
import { formatAddress } from "@/utils/botns";
import { Wallet, AlertTriangle, LogOut, ExternalLink, Copy, Check, ChevronDown } from "lucide-react";

export function WalletButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWrongNetwork = isConnected && chainId !== botchainTestnet.id;

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => {
            const connector = connectors[0];
            if (connector) connect({ connector });
          }}
          disabled={isConnecting || isConnectPending}
          className="cyber-button-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide cursor-pointer transition-all disabled:opacity-50"
        >
          <Wallet className="w-4 h-4" />
          <span>{isConnecting || isConnectPending ? "Connecting..." : "Connect Wallet"}</span>
        </button>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: botchainTestnet.id })}
        disabled={isSwitchPending}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all cursor-pointer shadow-lg shadow-rose-500/10"
      >
        <AlertTriangle className="w-4 h-4 animate-pulse text-rose-400" />
        <span>{isSwitchPending ? "Switching..." : "Switch to Botchain"}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="glass-card flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium border border-cyan-500/30 hover:border-cyan-400/60 transition-all cursor-pointer"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-slate-200 font-mono">{formatAddress(address)}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
          BOT
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 glass-dropdown rounded-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs text-slate-400 font-medium">Connected to Botchain</p>
              <p className="text-sm font-mono text-cyan-300 truncate mt-0.5">{address}</p>
            </div>

            <div className="py-2 space-y-1">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Address"}
                </span>
              </button>

              <a
                href={`https://scan.bohr.life/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on BohrScan
                </span>
              </a>
            </div>

            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  disconnect();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
