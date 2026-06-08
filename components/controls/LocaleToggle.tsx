"use client";
import { useLocale } from "@/i18n/AppProviders";
import { cn } from "@/lib/utils";
export function LocaleToggle({ compact=false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const isEs = locale === "es";
  return (
    <button onClick={()=>setLocale(isEs?"en":"es")} aria-label="Cambiar idioma"
      className={cn("flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] font-mono text-[10px] font-bold uppercase tracking-widest text-white/40 transition hover:border-white/12 hover:text-white/70",compact?"h-8 w-10":"h-9 w-12")}>
      {isEs?"EN":"ES"}
    </button>
  );
}
