"use client";
import { cn } from "@/lib/utils";
type Props = {
  eyebrow?: string; title: string; description?: string;
  actions?: React.ReactNode; className?: string;
};
export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <header className={cn(
      "relative overflow-hidden border-b border-white/[0.05] px-5 py-6 md:px-8",
      "[data-theme=light_&]:border-black/[0.06]",
      className
    )}>
      {/* Subtle top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"/>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/70 [data-theme=light]:text-violet-600/70">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-xl font-bold text-white/90 [data-theme=light]:text-black/85 md:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-white/40 [data-theme=light]:text-black/50">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>
        )}
      </div>
    </header>
  );
}
