"use client";
import { useLocale } from "@/i18n/AppProviders";
import { cn } from "@/lib/utils";
export function LocaleToggle({ compact=false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const isEs = locale === "es";
  return (
    <button onClick={()=>setLocale(isEs?"en":"es")} aria-label="Cambiar idioma"
      className={cn("flex items-center justify-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-tertiary)] transition hover:border-[var(--border-2)] hover:text-[var(--fg-primary)]",compact?"h-8 w-10":"h-9 w-12")}>
      {isEs?"EN":"ES"}
    </button>
  );
}
