"use client";

import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/mock-data";

interface ActivityRowProps {
  item: ActivityItem;
  className?: string;
  delay?: number;
}

const kindColors: Record<ActivityItem["kind"], string> = {
  deploy: "bg-vf-green",
  vault: "bg-vf-green",
  error: "bg-vf-error",
  vision: "bg-vf-green",
  warning: "bg-vf-warning",
  create: "bg-vf-green",
  scout: "bg-vf-green",
  settings: "bg-vf-fg-2",
  backup: "bg-vf-info",
  refactor: "bg-vf-green",
};

export function ActivityRow({ item, className, delay = 0 }: ActivityRowProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-2",
        "stagger-fade-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
          kindColors[item.kind]
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-xs text-vf-fg-2">{item.time}</span>
          <span className="text-sm text-vf-fg">{item.actor}</span>
          <span className="text-sm text-vf-fg-1">{item.verb}</span>
          <span className="font-mono text-sm text-vf-fg truncate">
            {item.target}
          </span>
        </div>
      </div>
    </div>
  );
}
