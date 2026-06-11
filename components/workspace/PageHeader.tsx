"use client";
import { cn } from "@/lib/utils";
type Props = {
  eyebrow?: string; title: string; description?: string;
  actions?: React.ReactNode; className?: string;
};
export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <header className={cn("relative overflow-hidden border-b border-white/[0.05] px-5 py-6 md:px-8", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"/>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/70">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-xl font-bold text-white/90 md:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-white/40">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:pt-0.5">{actions}</div>
        )}
      </div>
    </header>
  );
}
