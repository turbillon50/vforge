"use client";
import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";
function apply(t: "dark"|"light") {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("vf-theme", t); } catch {}
}
export function ThemeToggle({ compact=false }: { compact?: boolean }) {
  const [t, setT] = useState<"dark"|"light">("dark");
  useEffect(()=>{
    const s=(typeof window!=="undefined"&&localStorage.getItem("vf-theme")) as "dark"|"light"|null;
    const i=s??"dark"; setT(i); apply(i);
  },[]);
  const tog=()=>{ const n=t==="dark"?"light":"dark"; setT(n); apply(n); };
  return (
    <button onClick={tog} aria-label={t==="dark"?"Modo claro":"Modo oscuro"}
      className={cn("flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/40 transition hover:border-white/12 hover:text-white/70",compact?"h-8 w-8":"h-9 w-9")}>
      {t==="dark"?<IconSun size={14}/>:<IconMoon size={14}/>}
    </button>
  );
}
