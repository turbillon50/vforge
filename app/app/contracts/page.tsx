"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { IconFile, IconCheck, IconClock, IconPen, IconDownload, IconPlus, IconShield, IconChevR } from "@/components/brand/VFIcons";

const EASE:[number,number,number,number]=[0.22,1,0.36,1];
type Status="firmado"|"pendiente"|"borrador";
type Contract={ id:string;client:string;product:string;amount:string;status:Status;date:string;progress:number; };

const CONTRACTS:Contract[]=[
  {id:"VF-0042",client:"CSN Carnes Selectas",product:"Aplicación Personalizada",amount:"$12,000",status:"firmado",date:"12 May 2026",progress:100},
  {id:"VF-0041",client:"Hilda — HappyToc",product:"App + Publicación iOS",amount:"$17,000",status:"pendiente",date:"08 Jun 2026",progress:60},
  {id:"VF-0040",client:"Joel Tejeda — MT Empresarial",product:"Aplicación Personalizada",amount:"$12,000",status:"firmado",date:"28 Abr 2026",progress:100},
  {id:"VF-0043",client:"Nataly Cruz — Lnred",product:"MCP Empresarial",amount:"$25,000",status:"borrador",date:"—",progress:15},
];

const ST:Record<Status,{label:string;color:string;Icon:any}> = {
  firmado:   {label:"Firmado",color:"#34d399",Icon:IconCheck},
  pendiente: {label:"Pendiente",color:"#fbbf24",Icon:IconClock},
  borrador:  {label:"Borrador",color:"#a78bfa",Icon:IconPen},
};

export default function ContractsPage() {
  const [filter,setFilter]=useState("todos");
  const filtered=filter==="todos"?CONTRACTS:CONTRACTS.filter(c=>c.status===filter);
  const signed=CONTRACTS.filter(c=>c.status==="firmado").length;
  const pending=CONTRACTS.filter(c=>c.status==="pendiente").length;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{ease:EASE}} className="mb-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"/>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/8">
            <IconShield size={18} className="text-violet-400"/>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">Contratos</h1>
            <p className="text-[12px] text-white/40">Firma digital con respaldo legal</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          {label:"Firmados",value:signed,color:"#34d399"},
          {label:"Pendientes",value:pending,color:"#fbbf24"},
          {label:"Valor total",value:"$66k",color:"#a78bfa"},
        ].map((s,i)=>(
          <motion.div key={s.label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05,ease:EASE}}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a12] p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"/>
            <p className="text-2xl font-bold leading-none" style={{color:s.color}}>{s.value}</p>
            <p className="mt-1 text-[11px] text-white/40">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* CTA nuevo */}
      <button className="relative mb-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(124,58,237,0.35)] transition-all active:scale-[0.98] hover:shadow-[0_8px_40px_rgba(124,58,237,0.5)]">
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 hover:translate-x-full"/>
        <IconPlus size={15}/> Generar nuevo contrato
      </button>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {["todos","firmado","pendiente","borrador"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[10px] capitalize transition ${
              filter===f?"border-violet-500/40 bg-violet-500/12 text-violet-300":"border-white/[0.06] text-white/30 hover:text-white/60"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2.5">
        {filtered.map((c,i)=>{
          const {label,color,Icon}=ST[c.status];
          return (
            <motion.div key={c.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.05,ease:EASE}}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a12] p-4 transition hover:border-white/10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent"/>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
                    <IconFile size={16} className="text-white/40"/>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/85">{c.client}</p>
                    <p className="text-[11px] text-white/40">{c.product}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-white/25">{c.id}</span>
                      <span className="text-[9px] text-white/15">·</span>
                      <span className="font-mono text-[9px] text-white/25">{c.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[13px] font-bold text-white/80">{c.amount}</span>
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9px] font-semibold"
                    style={{background:`${color}15`,color,border:`1px solid ${color}25`}}>
                    <Icon size={9}/> {label}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full transition-all" style={{width:`${c.progress}%`,background:`linear-gradient(90deg,${color}90,${color})`}}/>
                </div>
                <span className="font-mono text-[9px] text-white/25">{c.progress}%</span>
                <IconChevR size={13} className="text-white/15 transition-transform group-hover:translate-x-0.5 group-hover:text-white/30"/>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/20">
        <IconShield size={11}/> Firma con validez legal vía DocuSign
      </p>
    </div>
  );
}
