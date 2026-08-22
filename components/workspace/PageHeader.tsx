"use client";
import { cn } from "@/lib/utils";
type Props = {
  eyebrow?: string; title: string; description?: string;
  actions?: React.ReactNode; className?: string;
};
export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <header className={cn("border-b border-[var(--border-1)] bg-white px-5 py-7 md:px-8 md:py-9", className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mono-label">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-3 text-[clamp(2.2rem,5vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-black">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-[var(--fg-secondary)]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>
        )}
      </div>
    </header>
  );
}
