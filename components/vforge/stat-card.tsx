"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  deltaLabel: string;
  deltaTone?: "positive" | "warning" | "neutral";
  className?: string;
  delay?: number;
}

const deltaToneClasses = {
  positive: "text-vf-green",
  warning: "text-vf-warning",
  neutral: "text-vf-fg-2",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  deltaLabel,
  deltaTone = "neutral",
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-vf-bg-1 border border-vf-border rounded-lg p-5",
        "stagger-fade-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 text-vf-green" />
      </div>
      <div className="font-mono text-[32px] leading-none text-vf-fg tracking-tight-vf">
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wide text-vf-fg-2">
        {label}
      </div>
      <div className={cn("mt-1 text-xs", deltaToneClasses[deltaTone])}>
        {deltaLabel}
      </div>
    </div>
  );
}
