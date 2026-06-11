"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Icon3D } from "@/components/brand/Icon3D";
import { IconExtLink, IconBranch, IconGlobe, IconCheck, IconRocket, IconActivity } from "@/components/brand/VFIcons";
import { useT } from "@/i18n/AppProviders";

interface Project { id:string; name:string; category:string; status:string; github_repo:string|null; vercel_url:string|null; domain?:string|null; }
type DS = "ready"|"preview"|"draft";
function statusOf(p:Project):DS {
  if(!p.vercel_url) return "draft";
  // live = tiene dominio propio (no .vercel.app) O category produccion
  const isCustomDomain = p.domain && !p.domain.includes("vercel.app");
  if(p.category==="produccion" || isCustomDomain) return "ready";
  return "preview";
}
const SM:Record<DS,{label:string;color:string;bg:string}> = {
  ready:   {label:"live",    color:"#34d399", bg:"rgba(52,211,153,0.10)"},
  preview: {label:"preview", color:"#a78bfa", bg:"rgba(139,92,246,0.08)"},
  draft:   {label:"draft",   color:"#6b7280", bg:"rgba(107,114,128,0.08)"},
};
const EASE:[number,number,number,number]=[0.22,1,0.36,1];

export default function DeploymentsPage() {
  const t=useT();
  const [projects,setProjects]=useState<Project[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    fetch("/api/projects",{cache:"no-store"})
      .then(r=>r.ok?r.json():{projects:[]})
      .then((d:{projects:Project[]})=>setProjects((d.projects??[]).filter(p=>p.vercel_url)))
      .catch(e=>setError(e instanceof Error?e.message:String(e)))
      .finally(()=>setLoading(false));
  },[]);
  return (
    <>
      <PageHeader eyebrow={t.deployments.eyebrow} title={t.deployments.title} description={t.deployments.body}
        actions={<button className="btn-primary"><IconRocket size={13}/> {t.deployments.open_vercel}</button>}/>
      <div className="px-5 py-6 md:px-8">
        {error&&<div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">⚠ {error}</div>}
        {loading&&(
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0,1,2,3].map(i=><div key={i} className="h-[140px] rounded-2xl border border-white/[0.05] bg-white/[0.02] animate-pulse"/>)}
          </div>
        )}
        {!loading&&projects.length===0&&(
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]"><Icon3D name="rocket" size={34} glow/></div>
            <p className="font-display text-lg text-white/70">Ningún proyecto desplegado todavía</p>
            <p className="max-w-sm text-sm text-white/30">Cuando V despliegue un proyecto en Vercel, aparece aquí.</p>
          </div>
        )}
        {!loading&&projects.length>0&&(
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p,idx)=>{
              const s=statusOf(p); const m=SM[s];
              const host=p.domain??(p.vercel_url??"").replace(/^https?:\/\//,"");
              const repo=(p.github_repo??"sin repo").split("/").pop()??"sin repo";
              return (
                <motion.a key={p.id} href={p.vercel_url!} target="_blank" rel="noreferrer"
                  initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
                  transition={{delay:Math.min(idx*0.04,0.3),duration:0.4,ease:EASE}}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a12] p-5 transition-all hover:border-white/10 hover:shadow-[0_0_30px_rgba(139,92,246,0.12)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"/>
                  {/* Glow halo */}
                  <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60"
                    style={{background:`radial-gradient(circle,${m.color},transparent 70%)`}}/>
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                        <Icon3D name="rocket" size={24} glow={s==="ready"}/>
                      </div>
                      <div>
                        <p className="font-display text-[14px] font-semibold text-white/90 truncate max-w-[140px]">{p.name}</p>
                        <p className="flex items-center gap-1 font-mono text-[10px] text-white/30 mt-0.5">
                          <IconBranch size={9}/> {repo}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]"
                      style={{borderColor:`${m.color}30`,background:m.bg,color:m.color}}>
                      {s==="ready"&&<span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{background:m.color}}/>}
                      {m.label}
                    </span>
                  </div>
                  <div className="relative mt-3.5 flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                    <IconGlobe size={11} className="shrink-0 text-cyan-400/60"/>
                    <span className="flex-1 truncate font-mono text-[11px] text-white/40">{host}</span>
                    <IconExtLink size={12} className="shrink-0 text-white/20 transition group-hover:text-violet-300"/>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
