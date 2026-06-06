import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  cta?: { label: string; href: string };
  className?: string;
  /** Compacto para cards pequeñas (aprobaciones, pendientes). */
  compact?: boolean;
};

/**
 * Estado vacío con icono + CTA (manifiesto B11).
 * Nunca dejar un panel vacío sin acción siguiente.
 */
export function EmptyState({ icon: Icon, title, hint, cta, className, compact }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-5" : "gap-3 py-8",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl border border-app bg-tint-2 text-on-surface-variant",
          compact ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        <Icon size={compact ? 16 : 20} />
      </span>
      <div>
        <p className={cn("font-medium text-on-surface", compact ? "text-[13px]" : "text-sm")}>{title}</p>
        {hint && <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-muted">{hint}</p>}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="group mt-1 inline-flex items-center gap-1.5 rounded-full border border-app-strong bg-tint-1 px-3.5 py-1.5 text-[12px] font-medium text-on-surface transition hover:border-violet-400/50 hover:text-violet-300 active:scale-[0.97]"
        >
          {cta.label}
          <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
}
