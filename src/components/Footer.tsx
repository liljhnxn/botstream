import React from "react";
import Link from "next/link";
import { Zap, ExternalLink, Shield, Code2, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#050711] py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">BotStream</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decentralized recurring subscription protocol powered by Botchain Testnet. Built for creators and Web3 services.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Chain ID: 968 (Botchain)
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Protocol</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/plans" className="hover:text-cyan-400 transition-colors">
                  Explore Plans
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-cyan-400 transition-colors">
                  Create a Plan
                </Link>
              </li>
              <li>
                <Link href="/dashboard/subscriptions" className="hover:text-cyan-400 transition-colors">
                  My Subscriptions
                </Link>
              </li>
              <li>
                <Link href="/dashboard/creator" className="hover:text-cyan-400 transition-colors">
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link href="/activity" className="hover:text-cyan-400 transition-colors">
                  Protocol Activity
                </Link>
              </li>
            </ul>
          </div>

          {/* Network & Verification */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Network & Explorer</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a
                  href="https://scan.bohr.life"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                >
                  <span>BohrScan Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://rpc.bohr.life"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                >
                  <span>Botchain RPC Endpoint</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-slate-500">Native Token: BOT (18 decimals)</span>
              </li>
            </ul>
          </div>

          {/* Technical Disclosure */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Honest Web3 Billing</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
              BotStream uses native BOT transactions. Subscriptions require manual wallet confirmation upon billing due dates. Your wallet funds are never pulled automatically.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 BotStream Protocol. Production MVP on Botchain Testnet.</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-slate-400">Solidity ^0.8.24 • Wagmi v2 • Viem</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
