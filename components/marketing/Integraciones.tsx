"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/";

interface Integration {
  id: string; name: string; category: string; accent: string;
  logo: string; bgImg: string; tagline: string; desc: string;
  role: string; steps: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    id:"neon", name:"Neon", category:"Base de datos", accent:"#00e5bf",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231325_3634e672-a272-4b6c-a0ec-35f03d9e5506.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234735_127bebff-30c0-48af-9795-24156084993a.png",
    tagline:"PostgreSQL serverless de cada proyecto",
    desc:"Cada app que V construye vive en su propio Neon PostgreSQL. Serverless, con branching para previews y Data API REST para queries desde Edge.",
    role:"Almacena usuarios, sesiones, datos del negocio y memoria de V",
    steps:["V crea el Neon project automáticamente","Genera el schema según el alcance","Conecta Clerk via JWKS para auth","Activa Data API REST para Edge queries"],
  },
  {
    id:"clerk", name:"Clerk", category:"Autenticación", accent:"#6c47ff",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231404_ab86fc88-0af6-4562-9886-dee0ddf79b76.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234712_b03e8a8e-c718-4b43-96b3-cfe557ad940b.png",
    tagline:"Login listo en 10 minutos, seguro para siempre",
    desc:"Social login, MFA, organizaciones y roles. V configura Clerk en cada nuevo proyecto sin documentación — el patrón está en el Skills Vault.",
    role:"Autentica a todos los usuarios de tus apps",
    steps:["V genera las env vars de Clerk en Vercel","Configura middleware de protección","Conecta con Neon via JWKS","Activa social login (Google, Apple)"],
  },
  {
    id:"vercel", name:"Vercel", category:"Deploy", accent:"#ffffff",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231302_e0eba5c5-f95a-4408-a44d-f0c9becc9774.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234613_5fc9f31a-2282-4ba2-889e-3b868de32cda.png",
    tagline:"Deploy en 30 segundos, cada push",
    desc:"Cada commit a GitHub triggerrea un deploy automático en Vercel. Preview deployments en cada PR. Edge network con nodos en São Paulo.",
    role:"Sirve todas las apps en producción con latencia mínima",
    steps:["V hace push a GitHub","Vercel detecta el commit","Build y deploy automático","URL de producción activa en <60s"],
  },
  {
    id:"resend", name:"Resend", category:"Email", accent:"#ff5c00",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231503_d8af086d-31ad-48b5-a4a9-e44f0463acb2.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234735_127bebff-30c0-48af-9795-24156084993a.png",
    tagline:"Emails que llegan al inbox, siempre",
    desc:"API moderna con templates en React JSX. DKIM configurado por V en cada dominio. Tasa de entrega >99% en México.",
    role:"Envía confirmaciones, notificaciones y campañas",
    steps:["V configura DKIM en name.com","Verifica el dominio en Resend","Crea templates con React Email","Activa webhooks de entrega"],
  },
  {
    id:"stripe", name:"Stripe", category:"Pagos", accent:"#635bff",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231430_08c8fc52-8277-4b55-a0dc-b92e9397f28d.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234548_546910fd-8a1b-4fa0-a95e-995730ae504f.png",
    tagline:"Pagos en vivo desde el día 1",
    desc:"V configura Stripe en live mode desde el primer día. Webhooks para checkout, suscripciones y reembolsos. IVA automático para México.",
    role:"Procesa todos los pagos de tus clientes",
    steps:["V inyecta las keys de Stripe","Configura el webhook endpoint","Activa Stripe Tax para IVA","Implementa checkout y portal"],
  },
  {
    id:"github", name:"GitHub", category:"Código", accent:"#e4e4e7",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231235_953715b5-b04f-4588-b5f2-84e0244f4c35.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234548_546910fd-8a1b-4fa0-a95e-995730ae504f.png",
    tagline:"Tu código, siempre tuyo",
    desc:"Cada proyecto tiene su propio repositorio en tu cuenta de GitHub. V hace commits, abre PRs y mantiene el historial completo.",
    role:"Versionamiento y CI/CD de todos los proyectos",
    steps:["V crea el repo en tu cuenta","Configura .gitignore y README","Conecta con Vercel para CI/CD","Código transferido al cliente en entrega"],
  },
  {
    id:"maps", name:"Google Maps", category:"Mapas", accent:"#4285f4",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231526_618fe59d-eb2e-409e-b928-ddf6849fa414.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234613_5fc9f31a-2282-4ba2-889e-3b868de32cda.png",
    tagline:"Mapas y geolocalización en tu app",
    desc:"Rutas, marcadores, geofencing y búsqueda de lugares. V integra Maps API en apps de logística, delivery y servicios con ubicación.",
    role:"Geolocalización, rutas y mapas interactivos",
    steps:["V configura la Maps API key","Activa los servicios necesarios","Implementa el componente de mapa","Configura restricciones de dominio"],
  },
  {
    id:"whatsapp", name:"WhatsApp", category:"Mensajería", accent:"#25d366",
    logo:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_231556_02f56566-5f85-4302-9509-2daa44e3c00f.png", bgImg:"https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_234712_b03e8a8e-c718-4b43-96b3-cfe557ad940b.png",
    tagline:"El canal donde viven tus clientes",
    desc:"Bots inteligentes, notificaciones automáticas y campañas de marketing via WhatsApp Business. Goossip corre en Hetzner con Baileys.",
    role:"Comunicación directa con clientes mexicanos",
    steps:["V configura el bot en Hetzner","Autenticación via pairing code","Programa campañas y respuestas","Monitoreo de entregas en tiempo real"],
  },
];

function IntegrationPopup({ item, onClose }: { item: Integration; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[90] flex items-end justify-center p-4 md:items-center"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ opacity:0, y:40, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:40, scale:0.95 }}
        transition={{ ease:EASE as any, duration:0.4 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a14]"
        style={{ boxShadow:`0 0 80px ${item.accent}30, 0 40px 100px rgba(0,0,0,0.6)` }}>
        <div className="relative h-44 overflow-hidden">
          <img src={item.bgImg} alt={item.name} className="h-full w-full object-cover opacity-60" style={{ filter:"saturate(1.3)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/60 backdrop-blur transition hover:text-white">✕</button>
          <div className="absolute bottom-4 left-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a14]">
              <img src={item.logo} alt={item.name} className="h-10 w-10 object-cover" />
            </div>
            <div>
              <p className="text-lg font-bold text-white leading-tight">{item.name}</p>
              <p className="text-[11px] text-white/40">{item.category}</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm font-semibold leading-relaxed text-white/80">{item.tagline}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/45">{item.desc}</p>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background:item.accent, boxShadow:`0 0 6px ${item.accent}` }} />
            <p className="text-[12px] text-white/50"><span className="font-semibold text-white/75">Rol en VForge:</span> {item.role}</p>
          </div>
          <div className="mt-4 space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Cómo V lo integra</p>
            {item.steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:i*0.07, ease:EASE as any }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold"
                    style={{ background:`${item.accent}20`, color:item.accent, border:`1px solid ${item.accent}40` }}>
                    {i+1}
                  </span>
                  <p className="text-[12px] text-white/55">{s}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function IntegrationCard({ item, onClick }: { item: Integration; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale:0.97 }}
      className="group relative flex-shrink-0 w-[220px] overflow-hidden rounded-2xl cursor-pointer"
      style={{ boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
      <div className="relative h-[280px] overflow-hidden">
        <img src={item.bgImg} alt={item.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ filter:"saturate(1.2) brightness(0.65)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050509] via-[#050509]/50 to-transparent" />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background:`radial-gradient(ellipse at 50% 0%, ${item.accent}25, transparent 60%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c0c18]">
          <img src={item.logo} alt={item.name} className="h-9 w-9 object-cover" />
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 backdrop-blur-sm">
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">{item.category}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-display text-[15px] font-bold text-white leading-tight">{item.name}</p>
          <p className="mt-1 text-[11px] leading-snug text-white/50">{item.tagline}</p>
          <div className="mt-3 flex items-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="h-1 w-1 rounded-full" style={{ background:item.accent }} />
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color:item.accent }}>Ver integración →</p>
          </div>
        </div>
      </div>
      <div className="h-0.5 w-full transition-all duration-300 group-hover:h-1"
        style={{ background:`linear-gradient(90deg, ${item.accent}80, ${item.accent})` }} />
    </motion.button>
  );
}

export function Integraciones() {
  const [selected, setSelected] = useState<Integration | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once:true, margin:"-80px" });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft ?? 0);
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }
  function onMouseUp() { isDragging.current = false; }

  return (
    <section ref={sectionRef} data-theme="dark" id="integraciones" className="relative bg-[#050509] py-20 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage:"radial-gradient(circle, rgba(139,92,246,0.8) 1px, transparent 1px)", backgroundSize:"40px 40px" }} />
      <div className="mx-auto max-w-6xl px-5">
        <motion.div initial={{ opacity:0, y:20 }} animate={inView ? { opacity:1, y:0 } : { opacity:0, y:20 }} transition={{ ease:EASE as any }}>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/60">Centro de integraciones</p>
          <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
            Un stack completo,<br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">conectado por V.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/40">
            Cada integración se configura automáticamente. Tú no tocas DNS ni variables de entorno.
          </p>
        </motion.div>
        <motion.div initial={{ opacity:0, y:30 }} animate={inView ? { opacity:1, y:0 } : { opacity:0, y:30 }}
          transition={{ delay:0.3, ease:EASE as any }}
          className="mt-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
              {INTEGRATIONS.length} integraciones · Desliza para ver
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400/40" />
              <span className="h-1.5 w-3 rounded-full bg-violet-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400/40" />
            </div>
          </div>
          <div ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth:"none", WebkitOverflowScrolling:"touch" as any }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
            <div className="pointer-events-none sticky left-0 z-10 w-8 shrink-0 bg-gradient-to-r from-[#050509] to-transparent" />
            {INTEGRATIONS.map((item, i) => (
              <motion.div key={item.id}
                initial={{ opacity:0, x:20 }} animate={inView ? { opacity:1, x:0 } : { opacity:0, x:20 }}
                transition={{ delay:0.4 + i*0.06, ease:EASE as any }}>
                <IntegrationCard item={item} onClick={() => setSelected(item)} />
              </motion.div>
            ))}
            <div className="pointer-events-none sticky right-0 z-10 w-8 shrink-0 bg-gradient-to-l from-[#050509] to-transparent" />
          </div>
          <p className="mt-3 text-center font-mono text-[10px] text-white/20">Toca cualquier tarjeta para ver cómo V la integra</p>
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <AnimatePresence>
        {selected && <IntegrationPopup item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}
