"use client";

import { cn } from "@/lib/utils";
import { pulseLabel } from "@/lib/live/run-pulse";

export function RunPulseBar({
  status,
  summary,
  error,
  progress,
}: {
  status: string;
  summary?: string | null;
  error?: string | null;
  progress?: number;
}) {
  const pulse = pulseLabel({ status, summary, error, progress });
  return (
    <div className="rounded-[8px] border border-[#e4e1d8] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-[#1c1917]">{pulse.title}</p>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            pulse.tone === "live" && "animate-pulse bg-[#1c1917]",
            pulse.tone === "dead" && "bg-[var(--color-danger)]",
            pulse.tone === "ok" && "bg-[#1c1917]",
            pulse.tone === "wait" && "bg-[#c4bfb4]",
          )}
        />
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efeee8]">
        <div
          className={cn(
            "h-full rounded-full",
            pulse.tone === "dead" ? "bg-[var(--color-danger)]" : "bg-[#1c1917]",
          )}
          style={{ width: `${pulse.percent}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[#6f6b64]">{pulse.detail}</p>
    </div>
  );
}
