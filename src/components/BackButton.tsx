import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export function BackButton({ href = "/", label = "Back to Home" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all group cursor-pointer w-fit"
    >
      <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
      <span>{label}</span>
    </Link>
  );
}
