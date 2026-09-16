import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subvalue?: string;
  icon: LucideIcon;
  trend?: string;
  color?: "cyan" | "purple" | "emerald" | "amber";
}

export function StatCard({
  title,
  value,
  subvalue,
  icon: Icon,
  trend,
  color = "cyan",
}: StatCardProps) {
  const colorMap = {
    cyan: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
    purple: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
    emerald: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
    amber: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
  };

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">{title}</span>
          <div className="text-2xl font-black text-white font-mono tracking-tight">{value}</div>
          {subvalue && <p className="text-xs text-slate-400 mt-1">{subvalue}</p>}
          {trend && <p className="text-[11px] text-cyan-400 mt-1 font-medium">{trend}</p>}
        </div>

        <div className={`p-3 rounded-xl bg-gradient-to-br border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
