"use client";

import React, { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { BOTSTREAM_CONTRACT_ADDRESS, BOTSTREAM_ABI } from "@/config/contracts";
import { formatAddress, formatBOT, resolveIdentity } from "@/utils/botns";
import { Activity, Zap, RefreshCw, XCircle, ArrowDownToLine, PlusCircle, ExternalLink } from "lucide-react";
import { BackButton } from "@/components/BackButton";

interface ProtocolLogItem {
  id: string;
  type: "PlanCreated" | "SubscriptionCreated" | "SubscriptionRenewed" | "SubscriptionCanceled" | "EarningsWithdrawn";
  title: string;
  user: `0x${string}`;
  amount?: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

export default function ActivityPage() {
  const publicClient = usePublicClient();
  const [logs, setLogs] = useState<ProtocolLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    if (!publicClient) return;
    setIsLoading(true);
    try {
      // Fetch latest block to set reasonable block range
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > 50000n ? latestBlock - 50000n : 0n;

      // Query contract events
      const rawLogs = await publicClient.getContractEvents({
        address: BOTSTREAM_CONTRACT_ADDRESS,
        abi: BOTSTREAM_ABI,
        fromBlock,
        toBlock: latestBlock,
      });

      const parsed: ProtocolLogItem[] = rawLogs.map((log, idx) => {
        const eventName = log.eventName as ProtocolLogItem["type"];
        const args = log.args as any;

        let title: string = eventName;
        let user: `0x${string}` = "0x0000000000000000000000000000000000000000";
        let amount: bigint | undefined = undefined;

        if (eventName === "PlanCreated") {
          title = `Plan #${args.planId?.toString()} Created`;
          user = args.creator;
          amount = args.price;
        } else if (eventName === "SubscriptionCreated") {
          title = `Subscribed to Plan #${args.planId?.toString()}`;
          user = args.subscriber;
          amount = args.amount;
        } else if (eventName === "SubscriptionRenewed") {
          title = `Subscription #${args.subscriptionId?.toString()} Renewed`;
          user = args.subscriber || args.creator || "0x0000000000000000000000000000000000000000";
          amount = args.amount;
        } else if (eventName === "SubscriptionCanceled") {
          title = `Subscription #${args.subscriptionId?.toString()} Canceled`;
          user = args.subscriber;
        } else if (eventName === "EarningsWithdrawn") {
          title = `Creator Earnings Withdrawn`;
          user = args.creator;
          amount = args.amount;
        }

        return {
          id: `${log.transactionHash}-${log.logIndex ?? idx}`,
          type: eventName,
          title,
          user,
          amount,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        };
      });

      // Reverse so newest first
      setLogs(parsed.reverse());
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [publicClient]);

  const getEventIcon = (type: ProtocolLogItem["type"]) => {
    switch (type) {
      case "PlanCreated":
        return <PlusCircle className="w-4 h-4 text-cyan-400" />;
      case "SubscriptionCreated":
        return <Zap className="w-4 h-4 text-indigo-400" />;
      case "SubscriptionRenewed":
        return <RefreshCw className="w-4 h-4 text-emerald-400" />;
      case "SubscriptionCanceled":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case "EarningsWithdrawn":
        return <ArrowDownToLine className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <BackButton />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white">Protocol Activity</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time on-chain subscription events emitted by the BotStream smart contract.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
          title="Refresh activity logs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-20 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-12 border border-white/10">
          <Activity className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white mb-1">No Recent Protocol Events</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Events will automatically appear here whenever plans are created, subscriptions are initiated, or renewals take place on Botchain Testnet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const identity = resolveIdentity(log.user);
            return (
              <div
                key={log.id}
                className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    {getEventIcon(log.type)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{log.title}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>User:</span>
                      <span className="font-mono text-cyan-300">{identity.name}</span>
                      <span className="text-slate-600">•</span>
                      <span>Block #{log.blockNumber.toString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                  {log.amount !== undefined && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block sm:hidden">Amount:</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {formatBOT(log.amount)} BOT
                      </span>
                    </div>
                  )}

                  <a
                    href={`https://scan.bohr.life/tx/${log.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors flex items-center gap-1 text-xs"
                    title="View Transaction on BohrScan"
                  >
                    <span className="hidden md:inline">BohrScan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
