"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconActivity, IconBranch, IconRocket, IconKey, IconGlobe,
  IconCheck, IconWarn, IconSparkles, IconShield,
} from "@/components/brand/VFIcons";
import { useT } from "@/i18n/AppProviders";

interface AuditEvent { id:string; action:string; resource_type:string|null; resource_id:string|null; ring:number|null; payload:unknown; created_at:string; }
type IconComp = (p:{size?:number;className?:string;style?:React.CSSProperties})=>ReactNode;

function timeAgo(iso:string):string {
  const ms=Date.now()-new Date(iso).getTime();
  const d=Math.floor(ms/(1000*60*60*24)); if(d>=1) return d+"d";
  const h=Math.floor(ms/(1000*60*60)); if(h>=1) return h+"h";
  const m=Math.floor(ms/(1000*60)); if(m>=1) return m+"m";
  return "ahora";
}

function iconFor(action:string):{Icon:IconComp;color:string} {
  if(action.startsWith("forge.chat"))  return {Icon:IconSparkles,color:"#a78bfa"};
  if(action.startsWith("project."))    return {Icon:IconBranch,color:"#a78bfa"};
  if(action.includes("deploy")||action.startsWith("vercel.")) return {Icon:IconRocket,color:"#34d399"};
  if(action.includes("secret")||action.startsWith("vault."))  return {Icon:IconKey,color:"#22d3ee"};
  if(action.includes("dns"))           return {Icon:IconGlobe,color:"#34d399"};
  if(action.includes("error")||action.includes("fail")) return {Icon:IconWarn,color:"#ef4444"};
  if(action.includes("ok")||action.includes("complete")) return {Icon:IconCheck,color:"#34d399"};
  if(action.includes("auth")||action.includes("seal")) return {Icon:IconShield,color:"#22d3ee"};
  return {Icon:IconActivity,color:"#a78bfa"};
}

export default function ActivityPage() {
  const t=useT();
  const [events,setEvents]=useState<AuditEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    fetch("/api/forge/activity?limit=50",{cache:"no-store"})
      .then(r=>r.ok?r.json():{events:[]})
      .then((d:{events:AuditEvent[];error?:string})=>{ if(d.error) setError(d.error); setEvents(d.events??[]); })
      .catch(e=>setError(e instanceof Error?e.message:String(e)))
      .finally(()=>setLoading(false));
  },[]);
  return (
    <>
      <PageHeader eyebrow={t.activity.eyebrow} title={t.activity.title} description={t.activity.body}
        actions={<button className="btn-ghost">{t.activity.export}</button>}/>
      <div className="mx-auto max-w-2xl px-5 py-6 md:px-8">
        {error&&<div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">⚠ {error}</div>}
        {loading&&<div className="space-y-2">{[0,1,2,3,4].map(i=><div key={i} className="h-[68px] rounded-xl border border-white/[0.04] bg-white/[0.015] animate-pulse"/>)}</div>}
        {!loading&&events.length===0&&!error&&(
          <div className="py-16 text-center">
            <p className="font-display text-lg text-white/50">Sin eventos todavía.</p>
            <p className="mt-2 text-sm text-white/25">Cuando V actúe sobre tus proyectos, los registros aparecen aquí.</p>
          </div>
        )}
        {!loading&&events.length>0&&(
          <ol className="relative space-y-2 border-l border-white/[0.06] pl-5">
            {events.map(ev=>{
              const {Icon,color}=iconFor(ev.action);
              return (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[22px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-2 ring-[#050509]"
                    style={{background:color}}/>
                  <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#0a0a12] p-4 transition hover:border-white/[0.08]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={14} style={{color,flexShrink:0}}/>
                        <p className="font-display text-[13px] font-semibold text-white/80 truncate">{ev.action}</p>
                        {ev.ring!==null&&<span className="font-mono text-[9px] text-white/20 shrink-0">ring {ev.ring}</span>}
                      </div>
                      <span className="font-mono text-[10px] text-white/20 shrink-0">{timeAgo(ev.created_at)}</span>
                    </div>
                    {(ev.resource_type||ev.resource_id)&&(
                      <p className="mt-1.5 font-mono text-[11px] text-white/30">
                        {[ev.resource_type,ev.resource_id].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
