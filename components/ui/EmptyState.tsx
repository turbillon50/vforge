"use client";
import type { ReactNode } from "react";
import { IconLayers } from "@/components/brand/VFIcons";
export function EmptyState({
  title, body, icon:Icon=IconLayers, compact=false, hint, cta
}: {
  title:string; body?:string; icon?:any; compact?:boolean;
  hint?:string; cta?:{label:string;href?:string;onClick?:()=>void};
}) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${compact?"py-8":"py-16"}`}>
      <div className={`flex items-center justify-center rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] ${compact?"h-10 w-10":"h-14 w-14"}`}>
        <Icon size={compact?20:24} className="text-[var(--fg-muted)]"/>
      </div>
      <div>
        <p className={`font-display font-semibold text-[var(--fg-secondary)] ${compact?"text-[13px]":"text-[15px]"}`}>{title}</p>
        {(body||hint)&&<p className="mt-1 max-w-xs text-[12px] text-[var(--fg-muted)]">{body||hint}</p>}
      </div>
      {cta&&(
        cta.href
          ? <a href={cta.href} className="rounded-xl bg-violet-600/80 px-4 py-2 font-mono text-[11px] text-white hover:bg-violet-600">{cta.label}</a>
          : <button onClick={cta.onClick} className="rounded-xl bg-violet-600/80 px-4 py-2 font-mono text-[11px] text-white hover:bg-violet-600">{cta.label}</button>
      )}
    </div>
  );
}
