"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, Sparkles, X, Rocket, HelpCircle,
  ShoppingBag, Tag, FileSignature, BookOpen,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPHERE = "/sphere-violet.png";

// Opciones del menú radial de bienvenida (antes del registro)
type RadialItem = {
  id: string;
  label: string;
  icon: typeof Rocket;
  href?: string;
  panel?: "welcome" | "faq";
  angle: number; // grados
};

const RADIAL: RadialItem[] = [
  { id: "welcome", label: "Qué es V", icon: Sparkles, panel: "welcome", angle: -90 },
  { id: "products", label: "Productos", icon: ShoppingBag, href: "#productos", angle: -34 },
  { id: "pricing", label: "Precios", icon: Tag, href: "/pricing", angle: 22 },
  { id: "contracts", label: "Contratos", icon: FileSignature, href: "#contratos", angle: 78 },
  { id: "faq", label: "Preguntas", icon: HelpCircle, panel: "faq", angle: 134 },
  { id: "start", label: "Empezar", icon: Rocket, href: "/sign-up", angle: 190 },
];

const WELCOME_CARDS = [
  { icon: Sparkles, title: "V es tu fábrica de IA", desc: "Una inteligencia que conoce tu stack, tus repos y tus clientes. Le hablas y construye productos reales." },
  { icon: Rocket, title: "De idea a producción", desc: "Apps, automatizaciones, bots y modelos de lenguaje. Todo desplegado, con dominio y listo para operar." },
  { icon: BookOpen, title: "Tú controlas todo", desc: "V ejecuta, tú decides. Ves cada avance, cada integración y cada despliegue en tiempo real." },
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
  const [panel, setPanel] = useState<"welcome" | "faq" | null>(null);

  // El orbe sigue el cursor/toque suavemente
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.36;
      mx.set(Math.max(-30, Math.min(30, (e.clientX - cx) / 12)));
      my.set(Math.max(-24, Math.min(24, (e.clientY - cy) / 12)));
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <section
      ref={heroRef}
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-24"
    >
      {/* Fondo obsidian con aura viva */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#03020a]" />
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 top-[32%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/25 blur-[130px]"
        />
        <div className="absolute left-1/2 top-[34%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[80px]" />
      </div>

      {/* ====== ORBE V — protagonista interactiva ====== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        style={{ x: sx, y: sy }}
        className="relative z-10 mb-6 flex items-center justify-center"
      >
        {/* Glow latente detrás */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-[320px] w-[320px] rounded-full bg-violet-600/35 blur-[80px]"
        />

        {/* Anillo pulsante que invita a tocar */}
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            className="absolute h-[260px] w-[260px] rounded-full border border-violet-400/40"
          />
        )}

        {/* La esfera — botón vivo */}
        <motion.button
          onClick={() => { setOpen((v) => !v); setPanel(null); }}
          whileTap={{ scale: 0.94 }}
          animate={{ y: [0, -12, 0] }}
          transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          className="relative flex h-[clamp(210px,60vw,300px)] w-[clamp(210px,60vw,300px)] items-center justify-center outline-none"
          aria-label="Activar V"
        >
          <motion.img
            src={SPHERE}
            alt="V"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full object-contain"
            style={{ mixBlendMode: "screen", filter: "drop-shadow(0 0 60px rgba(124,58,237,0.6)) drop-shadow(0 0 120px rgba(124,58,237,0.3)) saturate(1.15)" }}
            draggable={false}
          />
          {/* hint de toque */}
          {!open && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
              className="absolute -bottom-2 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/70"
            >
              Tócame
            </motion.span>
          )}
        </motion.button>

        {/* ====== MENÚ RADIAL ====== */}
        <AnimatePresence>
          {open && RADIAL.map((item, i) => {
            const rad = (item.angle * Math.PI) / 180;
            const radius = 168;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const Icon = item.icon;
            const content = (
              <motion.span
                key={item.id}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                transition={{ delay: i * 0.04, ease: EASE, duration: 0.4 }}
                className="absolute flex flex-col items-center gap-1"
                style={{ left: "50%", top: "50%", marginLeft: -32, marginTop: -32 }}
              >
                <span className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-violet-400/30 bg-[#0c0a1a]/90 backdrop-blur-xl transition-all hover:scale-110 hover:border-violet-400/60 hover:bg-violet-600/20"
                  style={{ boxShadow: "0 8px 30px rgba(124,58,237,0.3)" }}>
                  <Icon size={19} className="text-violet-300" />
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-white/70">{item.label}</span>
                </span>
              </motion.span>
            );
            if (item.href) {
              return (
                <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="absolute left-0 top-0 z-20">
                  {content}
                </Link>
              );
            }
            return (
              <button key={item.id} onClick={() => setPanel(item.panel!)} className="absolute left-0 top-0 z-20">
                {content}
              </button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* ====== TEXTO (se atenúa cuando el menú está abierto) ====== */}
      <motion.div
        animate={{ opacity: open ? 0.15 : 1, filter: open ? "blur(4px)" : "blur(0px)" }}
        transition={{ ease: EASE }}
        className="relative z-0 flex flex-col items-center"
      >
        <div className="mb-6 flex items-center gap-2 rounded-full border border-violet-400/30 bg-[#0a0614]/70 px-4 py-1.5 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-200 uppercase">V en línea</span>
        </div>

        <p className="mb-4 text-center text-[11px] font-semibold tracking-[0.25em] text-violet-400/60 uppercase">
          La fábrica de apps con IA
        </p>

        <h1 className="text-center text-[clamp(3rem,13vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em] text-white">
          Construye.<br />
          <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">Despliega.</span><br />
          Domina.
        </h1>

        <p className="mt-6 max-w-[420px] text-center text-[clamp(0.95rem,2.6vw,1.1rem)] font-light leading-relaxed text-white/50">
          V conoce tu stack, tus repos y tus clientes. Hablas — ella construye. Tú controlas todo.
        </p>

        <div className="mt-9 flex w-full max-w-sm flex-col items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 px-8 py-4 text-base font-semibold text-white shadow-[0_8px_40px_rgba(124,58,237,0.5)] transition-all hover:shadow-[0_8px_60px_rgba(124,58,237,0.7)] active:scale-[0.98]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Sparkles size={17} className="relative text-cyan-200" />
            <span className="relative">Despierta a V</span>
            <ArrowRight size={17} className="relative transition-transform group-hover:translate-x-1" />
          </button>
          <Link
            href="/sign-up"
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

      {/* tap fuera para cerrar el menú radial */}
      {open && !panel && (
        <button
          aria-label="Cerrar"
          onClick={() => setOpen(false)}
          className="absolute inset-0 z-[5] cursor-default"
        />
      )}

      {/* ====== PANELES (welcome / faq) ====== */}
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
              <div className="relative max-h-[88vh] w-full max-w-lg overflow-auto rounded-t-[2rem] border border-violet-400/30 bg-[#06040f] p-6 md:rounded-[2rem]"
                style={{ boxShadow: "0 0 120px rgba(124,58,237,0.4)" }}>
                <button onClick={() => setPanel(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition hover:bg-black/70">
                  <X size={16} />
                </button>

                {panel === "welcome" && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400/70">Bienvenido</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">Conoce a V</h2>
                    <div className="mt-5 space-y-3">
                      {WELCOME_CARDS.map((c, i) => (
                        <motion.div
                          key={c.title}
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, ease: EASE }}
                          className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
                            <c.icon size={18} className="text-violet-300" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{c.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-white/50">{c.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <Link href="/sign-up" onClick={() => setPanel(null)}
                      className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 py-4 text-sm font-semibold text-white"
                      style={{ boxShadow: "0 0 40px rgba(124,58,237,0.5)" }}>
                      Empieza gratis <ArrowRight size={14} />
                    </Link>
                  </>
                )}

                {panel === "faq" && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400/70">Resolvemos tus dudas</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">Preguntas frecuentes</h2>
                    <div className="mt-5 space-y-2.5">
                      {FAQ.map((f, i) => (
                        <motion.details
                          key={i}
                          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, ease: EASE }}
                          className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                        >
                          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white marker:content-['']">
                            {f.q}
                            <ArrowRight size={14} className="text-violet-400 transition-transform group-open:rotate-90" />
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
