"use client";

import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: "live" | "building" | "warning" | "error" | "idle";
  className?: string;
}

const statusConfig = {
  live: {
    label: "LIVE",
    dotClass: "bg-vf-green dot-live",
    textClass: "text-vf-green",
  },
  building: {
    label: "BUILDING",
    dotClass: "bg-vf-warning",
    textClass: "text-vf-warning",
  },
  warning: {
    label: "WARNING",
    dotClass: "bg-vf-warning",
    textClass: "text-vf-warning",
  },
  error: {
    label: "ERROR",
    dotClass: "bg-vf-error",
    textClass: "text-vf-error",
  },
  idle: {
    label: "IDLE",
    dotClass: "bg-vf-fg-2",
    textClass: "text-vf-fg-2",
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "bg-vf-bg-2 border border-vf-border",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClass)} />
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-wide",
          config.textClass
        )}
      >
        {config.label}
      </span>
    </div>
  );
}
