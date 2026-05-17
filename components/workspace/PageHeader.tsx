"use client";

import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-app px-5 py-7 md:flex-row md:items-end md:justify-between md:px-8 md:py-8",
        className
      )}
    >
      <div>
        {eyebrow && <p className="label-caps mb-2 text-cyber-cyan">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
