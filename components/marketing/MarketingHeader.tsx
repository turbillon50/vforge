"use client";
import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { useState } from "react";
import { IconMenu, IconShare, IconX } from "@/components/brand/VFIcons";
import { useT } from "@/i18n/AppProviders";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

export function MarketingHeader() {
  const [open,setOpen]=useState(false);
  const t=useT();
  const nav=[
    {href:"/#metodo",label:"Método"},
    {href:"/marketplace",label:"V-Shop"},
    {href:"/pricing",label:"Precios"},
    {href:"/blog",label:"Blog"},
    {href:"/mcp",label:"MCP"},
    {href:"/vulcano",label:"Navegador",badge:"IA"},
    {href:"/status",label:"Taller",badge:"Live"},
    {href:"/developers",label:"Desarrolladores",badge:"Pronto"},
  ];
  const handleShare=()=>{
    if(typeof navigator!=="undefined"&&navigator.share)
      navigator.share({title:"VForge",text:"La fábrica de apps con IA más potente.",url:"https://vforge.site"});
    else if(typeof navigator!=="undefined")
      navigator.clipboard?.writeText("https://vforge.site");
  };
  return (
    <header data-theme="dark" className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border-1)] bg-[#03020a]/85 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5">
        <Link href="/" className="shrink-0"><VWordmark/></Link>
        <nav data-theme="dark" className="ml-4 hidden items-center gap-0.5 md:flex">
          {nav.map(item=>(
            <Link key={item.href} href={item.href}
              className="relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[12px] text-[var(--fg-secondary)] transition hover:bg-white/[0.06] hover:text-white">
              {item.label}
              {item.badge&&<span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-300 uppercase tracking-wider">{item.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleToggle/>
          <button onClick={handleShare}
            className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 font-mono text-[11px] text-[var(--fg-secondary)] transition hover:text-[var(--fg-primary)] md:flex">
            <IconShare size={12}/>Compartir
          </button>
          <Link href="/sign-in" prefetch={false} className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2 font-mono text-[11px] text-[var(--fg-secondary)] transition hover:text-white">Entrar</Link>
          <Link href="/sign-up" prefetch={false} className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 font-mono text-[11px] font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition hover:brightness-110">Empezar</Link>
          <button onClick={()=>setOpen(v=>!v)} className="flex items-center justify-center rounded-xl border border-[var(--border-1)] bg-white/[0.025] p-2 text-[var(--fg-tertiary)] transition hover:text-[var(--fg-secondary)] md:hidden">
            {open?<IconX size={16}/>:<IconMenu size={16}/>}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {open&&(
        <div className="border-t border-[var(--border-1)] bg-[#03020a]/95 px-5 py-4 md:hidden">
          {nav.map(item=>(
            <Link key={item.href} href={item.href} onClick={()=>setOpen(false)}
              className="block rounded-xl px-3 py-2.5 font-mono text-[13px] text-[var(--fg-tertiary)] transition hover:bg-[var(--surface-1)] hover:text-[var(--fg-primary)]">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
