"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Tipos ──────────────────────────────────────────────────────
interface Integration {
  id: string;
  name: string;
  category: string;
  accent: string;
  logo: string;
  bgImg: string;
  tagline: string;
  desc: string;
  role: string; // qué hace dentro de VForge
  steps: string[]; // cómo se integra
}

// ── Datos ──────────────────────────────────────────────────────
function fav(d: string) { return `https://www.google.com/s2/favicons?domain=${d}&sz=128`; }

const INTEGRATIONS: Integration[] = [
  {
    id: "neon", name: "Neon", category: "Base de datos", accent: "#00e5bf",
    logo: fav("neon.tech"),
    bgImg: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
    tagline: "La base de datos serverless de cada proyecto",
    desc: "Cada app que V construye vive en su propio Neon PostgreSQL. Serverless, con branching para previews y Data API REST para queries desde Edge.",
    role: "Almacena usuarios, sesiones, datos del negocio y memoria de V",
    steps: ["V crea el Neon project automáticamente", "Genera el schema según el alcance", "Conecta Clerk via JWKS para auth", "Activa Data API REST para Edge queries"],
  },
  {
    id: "clerk", name: "Clerk", category: "Autenticación", accent: "#6c47ff",
    logo: fav("clerk.com"),
    bgImg: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&q=80",
    tagline: "Login listo en 10 minutos, seguro para siempre",
    desc: "Social login, MFA, organizaciones y roles. V configura Clerk en cada nuevo proyecto sin documentación — el patrón está en el Skills Vault.",
    role: "Autentica a todos los usuarios de tus apps",
    steps: ["V genera las env vars de Clerk", "Configura middleware de protección", "Conecta con Neon via JWKS", "Activa social login (Google, Apple)"],
  },
  {
    id: "vercel", name: "Vercel", category: "Deploy", accent: "#ffffff",
    logo: fav("vercel.com"),
    bgImg: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&q=80",
    tagline: "Deploy en 30 segundos, cada push",
    desc: "Cada commit a GitHub triggerrea un deploy automático en Vercel. Preview deployments en cada PR. Edge network con nodos en São Paulo.",
    role: "Sirve todas las apps en producción con latencia mínima",
    steps: ["V hace push a GitHub", "Vercel detecta el commit", "Build y deploy automático", "URL de producción activa en <60s"],
  },
  {
    id: "resend", name: "Resend", category: "Email", accent: "#ff5c00",
    logo: fav("resend.com"),
    bgImg: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600&q=80",
    tagline: "Emails que llegan al inbox, siempre",
    desc: "API moderna con templates en React JSX. DKIM configurado por V en cada dominio. Tasa de entrega >99% en México.",
    role: "Envía confirmaciones, notificaciones y campañas",
    steps: ["V configura DKIM en name.com", "Verifica el dominio en Resend", "Crea templates con React Email", "Activa webhooks de entrega"],
  },
  {
    id: "stripe", name: "Stripe", category: "Pagos", accent: "#635bff",
    logo: fav("stripe.com"),
    bgImg: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80",
    tagline: "Pagos en vivo desde el día 1",
    desc: "V configura Stripe en live mode desde el primer día. Webhooks para checkout, suscripciones y reembolsos. IVA automático para México.",
    role: "Procesa todos los pagos de tus clientes",
    steps: ["V inyecta las keys de Stripe", "Configura el webhook endpoint", "Activa Stripe Tax para IVA", "Implementa checkout y portal"],
  },
  {
    id: "github", name: "GitHub", category: "Código", accent: "#e4e4e7",
    logo: fav("github.com"),
    bgImg: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&q=80",
    tagline: "Tu código, siempre tuyo",
    desc: "Cada proyecto tiene su propio repositorio en tu cuenta de GitHub. V hace commits, abre PRs y mantiene el historial completo.",
    role: "Versionamiento y CI/CD de todos los proyectos",
    steps: ["V crea el repo en tu cuenta", "Configura el .gitignore y README", "Conecta con Vercel para CI/CD", "Código transferido al cliente en entrega"],
  },
  {
    id: "maps", name: "Google Maps", category: "Mapas", accent: "#4285f4",
    logo: fav("maps.google.com"),
    bgImg: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80",
    tagline: "Mapas y geolocalización en tu app",
    desc: "Rutas, marcadores, geofencing y búsqueda de lugares. V integra Maps API en apps de logística, delivery y servicios con ubicación.",
    role: "Geolocalización, rutas y mapas interactivos",
    steps: ["V configura la Maps API key", "Activa los servicios necesarios", "Implementa el componente de mapa", "Configura restricciones de dominio"],
  },
  {
    id: "whatsapp", name: "WhatsApp", category: "Mensajería", accent: "#25d366",
    logo: fav("whatsapp.com"),
    bgImg: "https://images.unsplash.com/photo-1612831455359-970e23a1e4e9?w=600&q=80",
    tagline: "El canal donde viven tus clientes",
    desc: "Bots inteligentes, notificaciones automáticas y campañas de marketing via WhatsApp Business. Goossip corre en Hetzner y se conecta via Baileys.",
    role: "Comunicación directa con clientes mexicanos",
    steps: ["V configura el bot en Hetzner", "Autenticación via pairing code", "Programa campañas y respuestas", "Monitoreo de entregas en tiempo real"],
  },
];

// ── Animación de conexión VForge ────────────────────────────────
const STACK_NODES = [
  { id: "domain",  label: "Dominio", x: 50,  y: 10,  color: "#e4e4e7" },
  { id: "github",  label: "GitHub",  x: 10,  y: 35,  color: "#e4e4e7" },
  { id: "vercel",  label: "Vercel",  x: 90,  y: 35,  color: "#ffffff" },
  { id: "neon",    label: "Neon",    x: 20,  y: 65,  color: "#00e5bf" },
  { id: "clerk",   label: "Clerk",   x: 50,  y: 80,  color: "#6c47ff" },
  { id: "stripe",  label: "Stripe",  x: 80,  y: 65,  color: "#635bff" },
  { id: "resend",  label: "Resend",  x: 15,  y: 90,  color: "#ff5c00" },
];
const EDGES = [
  ["domain","vercel"], ["github","vercel"], ["vercel","neon"],
  ["vercel","clerk"], ["clerk","neon"], ["vercel","stripe"],
  ["neon","clerk"], ["github","neon"], ["vercel","resend"],
];

function VForgeAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setStep(s => s < EDGES.length ? s + 1 : s), 400);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="relative mx-auto h-[280px] w-full max-w-sm select-none">
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const na = STACK_NODES.find(n => n.id === a)!;
          const nb = STACK_NODES.find(n => n.id === b)!;
          const active = step > i;
          return (
            <motion.line key={`${a}-${b}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={active ? nb.color : "rgba(255,255,255,0.08)"}
              strokeWidth="0.6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: active ? 1 : 0, opacity: active ? 0.6 : 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          );
        })}
        {/* Nodes */}
        {STACK_NODES.map((node, i) => {
          const active = step >= Math.floor(i * 0.7);
          return (
            <g key={node.id}>
              <motion.circle
                cx={node.x} cy={node.y} r="5.5"
                fill={active ? `${node.color}25` : "rgba(255,255,255,0.04)"}
                stroke={active ? node.color : "rgba(255,255,255,0.12)"}
                strokeWidth="0.8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: EASE }}
              />
              {active && (
                <motion.circle cx={node.x} cy={node.y} r="7"
                  fill="none" stroke={node.color} strokeWidth="0.4" opacity="0.4"
                  animate={{ r: [7, 10, 7], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <text x={node.x} y={node.y + 9}
                textAnchor="middle" fontSize="3.5" fill="white" opacity="0.6"
                style={{ fontFamily: "monospace" }}>
                {node.label}
              </text>
            </g>
          );
        })}
        {/* V center */}
        <motion.circle cx="50" cy="50" r="8"
          fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1"
          animate={{ r: [8, 9, 8], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <text x="50" y="53.5" textAnchor="middle" fontSize="6" fontWeight="bold"
          fill="#a78bfa" style={{ fontFamily: "system-ui" }}>V</text>
      </svg>
      {/* Step indicator */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <p className="font-mono text-[10px] text-white/30">
          {step < EDGES.length ? `Conectando ${EDGES[step]?.[1] ?? ""}...` : "✓ Stack completo"}
        </p>
      </div>
    </div>
  );
}

// ── Popup de integración ────────────────────────────────────────
function IntegrationPopup({ item, onClose }: { item: Integration; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end justify-center p-4 md:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ ease: EASE, duration: 0.4 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a14]"
        style={{ boxShadow: `0 0 80px ${item.accent}30, 0 40px 100px rgba(0,0,0,0.6)` }}
      >
        {/* Foto hero */}
        <div className="relative h-44 overflow-hidden">
          <img src={item.bgImg} alt={item.name} className="h-full w-full object-cover opacity-60" style={{ filter: "saturate(1.3)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/40 to-transparent" />
          {/* Sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <button onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/60 backdrop-blur transition hover:text-white">
            ✕
          </button>
          {/* Logo */}
          <div className="absolute bottom-4 left-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a14]">
              <img src={item.logo} alt={item.name} className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-lg font-bold text-white leading-tight">{item.name}</p>
              <p className="text-[11px] text-white/40">{item.category}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm font-semibold leading-relaxed text-white/80">{item.tagline}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/45">{item.desc}</p>

          {/* Rol en VForge */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.accent, boxShadow: `0 0 6px ${item.accent}` }} />
            <p className="text-[12px] text-white/50"><span className="font-semibold text-white/75">Rol en VForge:</span> {item.role}</p>
          </div>

          {/* Steps */}
          <div className="mt-4 space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Cómo V lo integra</p>
            {item.steps.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, ease: EASE }}
                className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold"
                  style={{ background: `${item.accent}20`, color: item.accent, border: `1px solid ${item.accent}40` }}>
                  {i + 1}
                </span>
                <p className="text-[12px] text-white/55">{s}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Tarjeta de integración (deslizable/touch) ───────────────────
function IntegrationCard({ item, onClick }: { item: Integration; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="group relative flex-shrink-0 w-[220px] overflow-hidden rounded-2xl cursor-pointer"
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4)` }}
    >
      {/* Foto de fondo */}
      <div className="relative h-[280px] overflow-hidden">
        <img src={item.bgImg} alt={item.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ filter: "saturate(1.2) brightness(0.7)" }} />
        {/* Gradiente bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050509] via-[#050509]/50 to-transparent" />
        {/* Glow superior del color de la integración */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${item.accent}25, transparent 60%)` }} />
        {/* Sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Logo */}
        <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/60 backdrop-blur-sm">
          <img src={item.logo} alt={item.name} className="h-6 w-6 object-contain" />
        </div>

        {/* Category pill */}
        <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 backdrop-blur-sm">
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/60">{item.category}</p>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-display text-[15px] font-bold text-white leading-tight">{item.name}</p>
          <p className="mt-1 text-[11px] leading-snug text-white/50">{item.tagline}</p>
          {/* Tap hint */}
          <div className="mt-3 flex items-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="h-1 w-1 rounded-full" style={{ background: item.accent }} />
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: item.accent }}>Ver integración →</p>
          </div>
        </div>
      </div>

      {/* Color accent bottom bar */}
      <div className="h-0.5 w-full transition-all duration-300 group-hover:h-1"
        style={{ background: `linear-gradient(90deg, ${item.accent}80, ${item.accent})` }} />
    </motion.button>
  );
}

// ── Componente principal ────────────────────────────────────────
export function Integraciones() {
  const [selected, setSelected] = useState<Integration | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  // Scroll horizontal con mouse drag
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
      {/* Top separator */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      {/* BG grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.8) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="mx-auto max-w-6xl px-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ ease: EASE }}>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-400/60">
            Centro de integraciones
          </p>
          <h2 className="mt-2 text-center text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight tracking-tight text-white">
            Un stack completo,<br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              conectado por V.
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm font-light text-white/40">
            Cada integración se configura automáticamente. Tú no tocas DNS ni variables de entorno.
          </p>
        </motion.div>

        {/* ── Animación de arquitectura ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, ease: EASE }}
          className="mt-12 mb-4"
        >
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/15 bg-[#0a0814] p-6 md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            {/* Glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-60 w-60 -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
              {/* Text */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/60 mb-2">Así funciona</p>
                <h3 className="text-xl font-bold text-white mb-3">V conecta todo en una sola sesión</h3>
                <p className="text-[13px] leading-relaxed text-white/45 mb-5">
                  Cuando creas un proyecto nuevo, V configura el stack completo:
                  dominio en name.com, repo en GitHub, deploy en Vercel, base de datos
                  en Neon, auth con Clerk, email con Resend y pagos con Stripe.
                  Todo en una conversación.
                </p>
                {/* Steps */}
                <div className="space-y-2.5">
                  {[
                    { n: "01", text: "V crea el repo y conecta Vercel", color: "#e4e4e7" },
                    { n: "02", text: "Neon DB con schema según alcance", color: "#00e5bf" },
                    { n: "03", text: "Clerk + JWKS + social login activo", color: "#6c47ff" },
                    { n: "04", text: "Resend con DKIM en el dominio propio", color: "#ff5c00" },
                    { n: "05", text: "Stripe en live mode + webhooks", color: "#635bff" },
                    { n: "06", text: "Deploy en producción — URL activa", color: "#22d3ee" },
                  ].map((s, i) => (
                    <motion.div key={s.n}
                      initial={{ opacity: 0, x: -12 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.4 + i * 0.08, ease: EASE }}
                      className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold"
                        style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                        {s.n}
                      </span>
                      <p className="text-[12px] text-white/55">{s.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              {/* Animación SVG */}
              <div className="flex items-center justify-center">
                <VForgeAnimation />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Carrusel de tarjetas ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, ease: EASE }}
          className="mt-10"
        >
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

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Left fade */}
            <div className="pointer-events-none sticky left-0 z-10 w-8 shrink-0 bg-gradient-to-r from-[#050509] to-transparent" />

            {INTEGRATIONS.map((item, i) => (
              <motion.div key={item.id}
                initial={{ opacity: 0, x: 20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.06, ease: EASE }}>
                <IntegrationCard item={item} onClick={() => setSelected(item)} />
              </motion.div>
            ))}

            {/* Right fade */}
            <div className="pointer-events-none sticky right-0 z-10 w-8 shrink-0 bg-gradient-to-l from-[#050509] to-transparent" />
          </div>

          {/* Toca para ver hint */}
          <p className="mt-3 text-center font-mono text-[10px] text-white/20">
            Toca cualquier tarjeta para ver cómo V la integra
          </p>
        </motion.div>
      </div>

      {/* Bottom separator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* Popup */}
      <AnimatePresence>
        {selected && <IntegrationPopup item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}
