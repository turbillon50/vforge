"use client";

import { Languages } from "lucide-react";
import { useLocale, useT } from "@/i18n/AppProviders";

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, toggleLocale } = useLocale();
  const t = useT();
  const label = locale === "es" ? "EN" : "ES";
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t.common.locale_toggle_aria}
      title={t.common.locale_toggle_aria}
      className={
        compact
          ? "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-app-strong bg-tint-1 px-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
          : "inline-flex h-11 items-center gap-2 rounded-md border border-app-strong bg-tint-1 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
      }
    >
      <Languages size={14} />
      <span>{label}</span>
    </button>
  );
}
