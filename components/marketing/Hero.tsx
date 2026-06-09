"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { IconArrowR, IconSparkles, IconX, IconRocket, IconHelp, IconBag, IconTag, IconLayout, IconBook, IconZap, IconGlobe, IconBot, IconFile } from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPHERE_IMG = "/sphere-violet.png";
const SPHERE_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_224036_5d36a8bc-fa57-49f9-ad05-1dee4fc96f6d.mp4";

type RadialItem = {
  id: string;
  label: string;
  icon: typeof IconRocket;
  href?: string;
  panel?: "welcome" | "faq" | "worlds";
  color: string;
};

const RADIAL: (RadialItem & { img3d: string })[] = [
  { id: "welcome", label: "Qué es V", icon: IconSparkles, panel: "welcome", color: "#a855f7", img3d: "/icons3d/sparkle.png" },
  { id: "worlds", label: "Por dónde\nempiezo", icon: IconBook, panel: "worlds", color: "#22d3ee", img3d: "/icons3d/book.png" },
  { id: "products", label: "Productos", icon: IconBag, href: "#productos", color: "#8b5cf6", img3d: "/icons3d/bag.png" },
  { id: "pricing", label: "Precios", icon: IconTag, href: "/pricing", color: "#0ea5e9", img3d: "/icons3d/tag.png" },
  { id: "faq", label: "Preguntas", icon: IconHelp, panel: "faq", color: "#f59e0b", img3d: "/icons3d/help.png" },
  { id: "start", label: "Empezar", icon: IconRocket, href: "/sign-up", color: "#22c55e", img3d: "/icons3d/rocket.png" },
];

// ── BIENVENIDA REDISEÑADA ─────────────────────────────────────
const LAUNCH_BADGES = [
  { icon: IconBot, label: "VForge MCP", sub: "Empresarial", color: "#a855f7" },
  { icon: IconZap, label: "Generador IA", sub: "de Contenido", color: "#22d3ee" },
  { icon: IconGlobe, label: "Apps reales", sub: "App Store + Play", color: "#22c55e" },
  { icon: IconFile, label: "Método VForge", sub: "De idea a deploy", color: "#f59e0b" },
];

const METODO_STEPS = [
  { n: "01", title: "Alcance en 1 sesión", desc: "V entiende tu idea, define features y te muestra el blueprint en tiempo real." },
  { n: "02", title: "Demo en 4 días", desc: "Ves tu app funcionando antes de pagar el siguiente paso. Sin sorpresas." },
  { n: "03", title: "Deploy a producción", desc: "Dominio propio, App Store, Google Play. Todo desplegado y operando." },
];

const WELCOME_STATS = [
  { value: "17+", label: "Apps en producción" },
  { value: "4d", label: "Demo garantizada" },
  { value: "100%", label: "Código tuyo" },
];

const WORLDS = [
  { icon: IconBag, color: "#8b5cf6", title: "Quiero una app o servicio", desc: "Eres un cliente. Mira los productos: apps, automatizaciones, bots, videos y MCP empresariales.", cta: "Ver productos", href: "#productos" },
  { icon: IconTag, color: "#0ea5e9", title: "Soy developer / agencia", desc: "Usa VForge como plataforma para construir y desplegar. Mira los planes Explorer, Studio y Forge.", cta: "Ver precios", href: "/pricing" },
  { icon: IconLayout, color: "#22c55e", title: "Ya soy cliente de VForge", desc: "Entra a tu portal y sigue el avance de tu proyecto en tiempo real, como una misión.", cta: "Entrar al portal", href: "/sign-in" },
];

const FAQ = [
  { q: "¿Necesito saber programar?", a: "No. Le describes lo que quieres a V y ella lo construye. Tú revisas y apruebas." },
  { q: "¿Cuánto tarda mi app?", a: "Ves una demo en los primeros 4 días. La entrega final depende del alcance, normalmente 2-3 etapas." },
  { q: "¿Mi app se publica en las tiendas?", a: "Sí. Publicamos en App Store ($5,000) y Google Play ($3,000). Es lo que nos diferencia." },
  { q: "¿Qué incluye el precio?", a: "PWA, dominio, diseño premium, base de datos, login, dashboard, notificaciones, correos, integraciones, manual y capacitación." },
  { q: "¿Puedo seguir el avance?", a: "Sí. Tienes un portal donde ves el estado, las integraciones activas y el próximo paso, como seguir una misión." },
];

export function Hero() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"welcome" | "faq" | "worlds" | null>(null);

  return (
    <section
      className="relative isolate flex min-h-[100svh] landscape:min-h-[100dvh] lg:min-h-[88vh] lg:landscape:min-h-[88vh] flex-col items-center justify-center overflow-hidden px-5 pb-10 pt-16 landscape:pb-6 landscape:pt-12 lg:pb-16 lg:pt-20"
      style={{ touchAction: "pan-y" }}
    >
      {/* ── FONDO: video de la esfera en loop ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#03020a]" />
        {/* Video esfera de fondo */}
        <video
          src={SPHERE_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          className="absolute left-1/2 top-1/2 h-[110%] w-[110%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-30"
          style={{ filter: "blur(2px) saturate(1.4)" }}
        />
        {/* Overlay oscuro para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03020a]/60 via-transparent to-[#03020a]/80" />
        {/* Aura violet viva */}
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.12, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 top-[35%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[120px]"
        />
      </div>

      {/* ── BADGE LANZAMIENTO ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 mb-5 flex items-center gap-2 rounded-full border border-violet-400/30 bg-[#0a0614]/70 px-4 py-1.5 backdrop-blur-xl"
      >
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
        />
        <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-200 uppercase">
          V·Momentum lanza VForge MCP + Generador IA
        </span>
      </motion.div>

      {/* ── ORBE V (con la esfera de imagen encima del video) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        className="relative z-10 mb-6 flex items-center justify-center"
      >
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-[clamp(100px,22vw,200px)] w-[clamp(100px,22vw,200px)] landscape:h-[100px] landscape:w-[100px] lg:h-[220px] lg:w-[220px] lg:landscape:h-[220px] lg:landscape:w-[220px] rounded-full bg-violet-600/35 blur-[80px]"
        />
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            className="absolute h-[230px] w-[230px] rounded-full border border-violet-400/40"
          />
        )}
        <motion.button
          onClick={() => { setOpen((v) => !v); setPanel(null); }}
          whileTap={{ scale: 0.94 }}
          animate={{ y: [0, -12, 0] }}
          transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          className="relative flex h-[clamp(120px,22vw,220px)] w-[clamp(120px,22vw,220px)] landscape:h-[clamp(80px,18vh,160px)] landscape:w-[clamp(80px,18vh,160px)] lg:h-[200px] lg:w-[200px] lg:landscape:h-[200px] lg:landscape:w-[200px] items-center justify-center outline-none"
          style={{ touchAction: "pan-y" }}
          aria-label="Activar V"
        >
          <motion.img
            src={SPHERE_IMG} loading="lazy"
            alt="V"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full object-contain"
            style={{ filter: "drop-shadow(0 0 50px rgba(124,58,237,0.6)) drop-shadow(0 0 100px rgba(124,58,237,0.3))" }}
            draggable={false}
          />
          {!open && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
              className="absolute -bottom-1 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/70"
            >
              Tócame
            </motion.span>
          )}
        </motion.button>
      </motion.div>

      {/* ── MENÚ V ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ ease: EASE, duration: 0.4 }}
              className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-md rounded-t-[2rem] border-t border-violet-400/30 bg-[#08060f]/95 p-6 pb-9 backdrop-blur-2xl"
              style={{ boxShadow: "0 -20px 80px rgba(124,58,237,0.35)" }}
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <p className="text-sm font-semibold text-white">V te escucha. ¿A dónde vamos?</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {RADIAL.map((item, i) => {
                  const inner = (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, ease: EASE }}
                      className="flex h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-center transition-all active:scale-95"
                      style={{ boxShadow: `inset 0 1px 0 ${item.color}20` }}
                    >
                      <img src={item.img3d} alt="" className="h-11 w-11 object-contain" style={{ filter: `drop-shadow(0 0 8px ${item.color}80)` }} draggable={false} />
                      <span className="whitespace-pre-line text-[10px] font-semibold leading-tight text-white/80">{item.label}</span>
                    </motion.div>
                  );
                  return item.href ? (
                    <Link key={item.id} href={item.href} onClick={() => setOpen(false)}>{inner}</Link>
                  ) : (
                    <button key={item.id} onClick={() => setPanel(item.panel!)} className="text-left">{inner}</button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TEXTO HERO ── */}
      <motion.div
        animate={{ opacity: open ? 0.12 : 1, filter: open ? "blur(4px)" : "blur(0px)" }}
        transition={{ ease: EASE }}
        className="relative z-0 flex flex-col items-center"
      >
        <p className="mb-4 text-center text-[11px] font-semibold tracking-[0.25em] text-violet-400/60 uppercase">
          La fábrica de apps con IA
        </p>
        <h1 className="text-center text-[clamp(2rem,8vw,4.8rem)] landscape:text-[clamp(1.6rem,6vh,3rem)] font-bold leading-[0.92] tracking-[-0.04em] text-white lg:text-[clamp(2.8rem,10vw,4.8rem)] lg:landscape:text-[clamp(2.8rem,10vw,4.8rem)]">
          Construye.<br />
          <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">Despliega.</span><br />
          Domina.
        </h1>
        <p className="mt-6 max-w-[420px] text-center text-[clamp(0.95rem,2.6vw,1.1rem)] font-light leading-relaxed text-white/60">
          V conoce tu stack, tus repos y tus clientes. Hablas — ella construye. Tú controlas todo.
        </p>

        {/* CTA buttons */}
        <div className="mt-9 flex w-full max-w-sm flex-col items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 px-8 py-4 text-base font-semibold text-white shadow-[0_8px_40px_rgba(124,58,237,0.5)] transition-all hover:shadow-[0_8px_60px_rgba(124,58,237,0.7)] active:scale-[0.98]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <IconSparkles size={17} className="relative text-cyan-200" />
            <span className="relative">Despierta a V</span>
            <IconArrowR size={17} className="relative transition-transform group-hover:translate-x-1" />
          </button>
          <Link href="/sign-up"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-4 text-base font-medium text-white/70 backdrop-blur-sm transition-all hover:border-violet-400/30 hover:bg-white/[0.07] hover:text-white"
          >
            Empieza gratis
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-white/30">
          <span className="flex items-center gap-1.5"><span className="text-cyan-400/70">✓</span> Sin tarjeta</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5"><span className="text-cyan-400/70">✓</span> Deploy en segundos</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5"><span className="text-cyan-400/70">✓</span> 17+ apps en producción</span>
        </div>
      </motion.div>

      {/* ── PANELES ── */}
      <AnimatePresence>
        {panel && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPanel(null)}
              className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ ease: EASE, duration: 0.4 }}
              className="fixed inset-0 z-[81] flex items-end justify-center md:items-center"
            >
              <div
                className="relative max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[2rem] border border-violet-400/20 bg-[#06040f] p-6 pb-10 md:rounded-[2rem]"
                style={{ boxShadow: "0 0 120px rgba(124,58,237,0.4)" }}
              >
                <button
                  onClick={() => setPanel(null)}
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition hover:bg-black/70"
                >
                  <IconX size={16} />
                </button>

                {/* ── PANEL BIENVENIDA NUEVO ── */}
                {panel === "welcome" && (
                  <div>
                    {/* Header con video esfera mini */}
                    <div className="relative mb-6 overflow-hidden rounded-2xl border border-violet-500/20">
                      <video
                        src={SPHERE_VIDEO}
                        autoPlay loop muted playsInline
                        className="h-36 w-full object-cover opacity-60"
                        style={{ filter: "saturate(1.5)" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#06040f] via-[#06040f]/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/80">V·Momentum</p>
                        <p className="text-xl font-bold text-white leading-tight">Somos VForge</p>
                      </div>
                    </div>

                    {/* Qué somos */}
                    <p className="text-sm leading-relaxed text-white/60 mb-5">
                      Somos la <span className="text-white font-medium">fábrica de apps con IA</span> de México. Construimos productos reales — PWAs, apps móviles, automatizaciones y MCPs — usando el Método VForge: de tu idea a producción en días, no meses.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {WELCOME_STATS.map((s) => (
                        <div key={s.label} className="rounded-2xl border border-white/8 bg-white/3 p-3 text-center">
                          <p className="text-xl font-bold text-white">{s.value}</p>
                          <p className="mt-0.5 text-[10px] text-white/40 leading-tight">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Lo nuevo */}
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/70 mb-3">
                      🚀 Recién lanzado
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {LAUNCH_BADGES.map((b, i) => (
                        <motion.div
                          key={b.label}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07, ease: EASE }}
                          className="flex items-center gap-2.5 rounded-2xl border p-3"
                          style={{ borderColor: `${b.color}25`, background: `${b.color}0c` }}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${b.color}20` }}>
                            <b.icon size={15} style={{ color: b.color }} />
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-white leading-tight">{b.label}</p>
                            <p className="text-[10px] text-white/40">{b.sub}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* El Método VForge */}
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 mb-3">
                      El Método VForge
                    </p>
                    <div className="space-y-2 mb-6">
                      {METODO_STEPS.map((s, i) => (
                        <motion.div
                          key={s.n}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.08, ease: EASE }}
                          className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/3 p-3"
                        >
                          <span className="font-mono text-[11px] font-bold text-violet-400/60 mt-0.5 shrink-0">{s.n}</span>
                          <div>
                            <p className="text-[12px] font-semibold text-white">{s.title}</p>
                            <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">{s.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <button
                      onClick={() => setPanel("worlds")}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-4 text-sm font-semibold text-white"
                      style={{ boxShadow: "0 0 40px rgba(124,58,237,0.5)" }}
                    >
                      ¿Por dónde empiezo? <IconArrowR size={14} />
                    </button>
                  </div>
                )}

                {/* ── PANEL MUNDOS ── */}
                {panel === "worlds" && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400/70">V te orienta</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">¿Por dónde empiezo?</h2>
                    <p className="mt-1 text-xs text-white/40">Dime quién eres y te llevo al lugar correcto.</p>
                    <div className="mt-5 space-y-3">
                      {WORLDS.map((w, i) => (
                        <motion.div key={w.title}
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, ease: EASE }}
                          className="rounded-2xl border p-4" style={{ borderColor: `${w.color}30`, background: `${w.color}0c` }}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${w.color}1f`, border: `1px solid ${w.color}40` }}>
                              <w.icon size={18} style={{ color: w.color }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{w.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-white/50">{w.desc}</p>
                            </div>
                          </div>
                          <Link href={w.href} onClick={() => { setPanel(null); setOpen(false); }}
                            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white transition-transform active:scale-95"
                            style={{ background: `${w.color}` }}>
                            {w.cta} <IconArrowR size={13} />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── PANEL FAQ ── */}
                {panel === "faq" && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/70">Resolvemos tus dudas</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">Preguntas frecuentes</h2>
                    <div className="mt-5 space-y-2.5">
                      {FAQ.map((f, i) => (
                        <motion.details key={i}
                          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, ease: EASE }}
                          className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
                            {f.q}
                            <IconArrowR size={14} className="text-violet-400 transition-transform group-open:rotate-90" />
                          </summary>
                          <p className="mt-2 text-xs leading-relaxed text-white/50">{f.a}</p>
                        </motion.details>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
