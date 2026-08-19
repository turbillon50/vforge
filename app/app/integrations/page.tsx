"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconCheck, IconWarn, IconLink, IconKey, IconRefresh } from "@/components/brand/VFIcons";
import {
  GitHubLogo, VercelLogo, NeonLogo, ClerkLogo, StripeLogo,
  ResendLogo, AnthropicLogo, OpenAILogo, TwilioLogo, MercadoPagoLogo,
} from "@/components/brand/logos/ServiceLogos";
import { useT } from "@/i18n/AppProviders";
import { motion } from "framer-motion";
import ConnectionsHealth from "@/components/integrations/ConnectionsHealth";

const EASE:[number,number,number,number]=[0.22,1,0.36,1];

interface HealthData { ok:boolean; checks:Record<string,boolean|string|number>; }

const SERVICES = [
  { id:"github",   name:"GitHub",        Logo:GitHubLogo,    color:"#e4e4e7", desc:"Control de versiones y repositorios",  oauthKey:"github"  },
  { id:"vercel",   name:"Vercel",        Logo:VercelLogo,    color:"#e4e4e7", desc:"Deploy y hosting serverless",           oauthKey:"vercel"  },
  { id:"neon",     name:"Neon",          Logo:NeonLogo,      color:"#00e5bf", desc:"Base de datos PostgreSQL serverless",   pasteKey:"neon"    },
  { id:"clerk",    name:"Clerk",         Logo:ClerkLogo,     color:"#6c47ff", desc:"Autenticación y gestión de usuarios",   pasteKey:"clerk"   },
  { id:"stripe",   name:"Stripe",        Logo:StripeLogo,    color:"#635bff", desc:"Pagos y suscripciones",                 oauthKey:"stripe"  },
  { id:"resend",   name:"Resend",        Logo:ResendLogo,    color:"#e4e4e7", desc:"Email transaccional y campañas",        pasteKey:"resend"  },
  { id:"anthropic",name:"Anthropic",     Logo:AnthropicLogo, color:"#ca8a04", desc:"Claude API — el modelo detrás de V",    manual:true        },
  { id:"openai",   name:"OpenAI",        Logo:OpenAILogo,    color:"#10a37f", desc:"GPT-4 y modelos auxiliares",             manual:true        },
  { id:"twilio",   name:"Twilio",        Logo:TwilioLogo,    color:"#f22f46", desc:"SMS, voz y WhatsApp",                   manual:true        },
  { id:"mp",       name:"Mercado Pago",  Logo:MercadoPagoLogo,color:"#009ee3",desc:"Pagos en pesos mexicanos",              manual:true        },
];

export default function IntegrationsPage() {
  const t=useT();
  const [data,setData]=useState<HealthData|null>(null);
  const [loading,setLoading]=useState(true);
  const [pasteValues,setPasteValues]=useState<Record<string,string>>({});
  const [states,setStates]=useState<Record<string,"idle"|"saving"|"connected"|"error">>({});
  const [errors,setErrors]=useState<Record<string,string>>({});

  useEffect(()=>{
    const sp=new URLSearchParams(window.location.search);
    const g=sp.get("github"), v=sp.get("vercel"), s=sp.get("stripe");
    const st:Record<string,"idle"|"saving"|"connected"|"error">={};
    if(g==="ok") st.github="connected";
    if(v==="ok") st.vercel="connected";
    if(s==="ok") st.stripe="connected";
    setStates(st);
    fetch("/api/admin/health",{cache:"no-store"})
      .then(r=>r.ok?r.json():{ok:false,checks:{}})
      .then(setData).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  async function connectPaste(key:string) {
    const val=pasteValues[key]?.trim(); if(!val) return;
    setStates(s=>({...s,[key]:"saving"})); setErrors(e=>({...e,[key]:""}));
    try {
      const r=await fetch(`/api/connect/${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:val})});
      const d=await r.json();
      if(d.ok) setStates(s=>({...s,[key]:"connected"}));
      else { setStates(s=>({...s,[key]:"error"})); setErrors(e=>({...e,[key]:d.error||"rechazada"})); }
    } catch { setStates(s=>({...s,[key]:"error"})); setErrors(e=>({...e,[key]:"Error de red"})); }
  }

  function isConnected(svc:typeof SERVICES[0]):boolean {
    const id=svc.id;
    if(states[id]==="connected") return true;
    // OAuth services detected via callback redirect param (e.g. ?github=ok)
    if(svc.oauthKey) {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      return params.get(svc.oauthKey) === "ok";
    }
    // API-key services: check health endpoint keys
    if(svc.pasteKey === "neon") return data?.checks?.db === true;
    if(svc.pasteKey === "openrouter") return data?.checks?.openrouter === true;
    if(svc.pasteKey && data?.checks?.[svc.pasteKey]) return !!data.checks[svc.pasteKey];
    return false;
  }

  const connected=SERVICES.filter(s=>isConnected(s)).length;

  return (
    <>
      <PageHeader eyebrow={t.integrations?.eyebrow??"Integraciones"} title={t.integrations?.title??"Conexiones activas"} description={t.integrations?.body??"Conecta los servicios que V usa para operar tus proyectos."}
        actions={<button className="btn-ghost" onClick={()=>window.location.reload()}><IconRefresh size={13}/> Refrescar</button>}/>

      {/* Stats bar */}
      <div className="mx-auto max-w-4xl px-5 pb-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div initial={{width:0}} animate={{width:`${(connected/SERVICES.length)*100}%`}}
              transition={{duration:0.8,ease:EASE}} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"/>
          </div>
          <span className="font-mono text-[11px] text-[var(--fg-muted)]">{connected}/{SERVICES.length} conectados</span>
        </div>
      </div>

      {/* Estado de conexiones (health dashboard) */}
      <div className="mx-auto max-w-4xl px-5 pb-8 md:px-8 reveal-up">
        <ConnectionsHealth />
      </div>

      {/* Grid */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 px-5 pb-8 md:grid-cols-2 md:px-8">
        {SERVICES.map((svc,i)=>{
          const { Logo, color, name, desc, id } = svc;
          const conn=isConnected(svc);
          const st=states[id]??"idle";
          const err=errors[id];
          return (
            <motion.div key={id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04,ease:EASE}}
              className="relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[#0a0a12] p-5 transition hover:border-[var(--border-1)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent"/>
              {conn&&<span className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{background:`linear-gradient(90deg,transparent,${color}60,transparent)`}}/>}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Logo container */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-1)] bg-[#0e0e18]">
                    <Logo className="h-5 w-5" style={{color}} aria-label={name}/>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--fg-primary)]">{name}</p>
                    <p className="text-[11px] text-[var(--fg-muted)]">{desc}</p>
                  </div>
                </div>
                {conn ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
                    <IconCheck size={10}/> Conectado
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-1)] bg-white/[0.025] px-2.5 py-1 font-mono text-[10px] text-[var(--fg-muted)]">
                    Sin conectar
                  </span>
                )}
              </div>

              {/* Connect action */}
              {!conn && (
                <div className="mt-4">
                  {svc.oauthKey && (
                    <a href={`/api/auth/${svc.oauthKey}/start`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-white/[0.025] py-2.5 font-mono text-[11px] text-[var(--fg-tertiary)] transition hover:border-violet-500/30 hover:text-violet-300">
                      <IconLink size={12}/> Conectar con {name}
                    </a>
                  )}
                  {svc.pasteKey && (
                    <div className="flex gap-2">
                      <input value={pasteValues[svc.pasteKey!]||""} onChange={e=>setPasteValues(v=>({...v,[svc.pasteKey!]:e.target.value}))}
                        placeholder={`Pega tu ${name} API key`}
                        className="flex-1 rounded-xl border border-[var(--border-1)] bg-white/[0.025] px-3 py-2.5 font-mono text-[11px] text-[var(--fg-secondary)] outline-none placeholder:text-[var(--fg-muted)] focus:border-violet-500/40"/>
                      <button onClick={()=>connectPaste(svc.pasteKey!)} disabled={st==="saving"||!pasteValues[svc.pasteKey!]}
                        className="flex items-center gap-1.5 rounded-xl bg-violet-600/80 px-4 py-2.5 font-mono text-[11px] text-white disabled:opacity-40 hover:bg-violet-600">
                        {st==="saving"?<span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"/>:<IconKey size={12}/>}
                        Guardar
                      </button>
                    </div>
                  )}
                  {svc.manual && (
                    <p className="text-center font-mono text-[10px] text-[var(--fg-muted)]">Configurar en Settings → Secrets</p>
                  )}
                  {err&&<p className="mt-2 text-center text-[11px] text-red-400">⚠ {err}</p>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
