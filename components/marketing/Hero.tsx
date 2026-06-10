"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  IconArrowR,
  IconSparkles,
  IconRocket,
  IconBot,
  IconBag,
  IconActivity,
  IconX,
} from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;

type SphereId = "forge" | "vulcano";

type SphereDef = {
  id: SphereId;
  img: string;
  eyebrow: string;
  name: string;
  tagline: string;
  accent: string;
  what: string;
  bullets: string[];
  action: string;
  links: { label: string; href: string; primary?: boolean }[];
};

const SPHERES: SphereDef[] = [
  {
    id: "forge",
    img: "/hero/forge-sphere.webp",
    eyebrow: "La plataforma",
    name: "VForge",
    tagline: "La forja",
    accent: "#a78bfa",
    what: "Donde tu idea se vuelve un producto real. VForge toma lo que describes y lo convierte en una app —PWA, móvil o MCP— desplegada a producción con dominio, base de datos y panel.",
    bullets: ["De idea a deploy en días", "Apps reales en App Store y Play", "El código es tuyo"],
    action: "Forjando producto",
    links: [
      { label: "Ver productos", href: "#productos", primary: true },
      { label: "Cómo funciona", href: "/pricing" },
    ],
  },
  {
    id: "vulcano",
    img: "/hero/vulcano-sphere.webp",
    eyebrow: "El copiloto",
    name: "Vulcano",
    tagline: "La IA que construye",
    accent: "#22d3ee",
    what: "La inteligencia que forja contigo. Hablas y Vulcano ejecuta: escribe código, conecta integraciones, despliega y vigila tu infraestructura en tiempo real. Tú diriges, él construye.",
    bullets: ["Construye y despliega por ti", "Conoce tu stack y tus repos", "Trabaja mientras tú revisas"],
    action: "Vulcano ejecutando",
    links: [
      { label: "Navegador Vulcano", href: "/vulcano", primary: true },
      { label: "El Taller", href: "/status" },
    ],
  },
];

const TOUR: { target: "head" | SphereId | "cta"; title: string; body: string }[] = [
  { target: "head", title: "Bienvenido a VForge", body: "Te doy un recorrido de 20 segundos. La fábrica de apps con IA, en dos piezas." },
  { target: "forge", title: "1 · La forja", body: "VForge es la plataforma: convierte tu idea en una app real desplegada a producción." },
  { target: "vulcano", title: "2 · El copiloto", body: "Vulcano es la IA que construye contigo. Habla y él ejecuta: código, deploy, integraciones." },
  { target: "cta", title: "Tú decides", body: "Pasa el cursor sobre cada esfera para ver qué hace, o empieza gratis ahora." },
];

export function Hero() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<SphereId | null>(null);

  const [tour, setTour] = useState(0);
  const [tourOn, setTourOn] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const forgeRef = useRef<HTMLDivElement>(null);
  const vulcanoRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setTourOn(true), 900);
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!tourOn) return;
    if (tour >= TOUR.length - 1) return;
    const t = setTimeout(() => setTour((s) => s + 1), 3800);
    return () => clearTimeout(t);
  }, [tourOn, tour]);

  useEffect(() => {
    if (!tourOn) {
      setRing(null);
      return;
    }
    const step = TOUR[tour];
    const map: Record<string, React.RefObject<HTMLElement>> = {
      head: headRef as React.RefObject<HTMLElement>,
      forge: forgeRef as React.RefObject<HTMLElement>,
      vulcano: vulcanoRef as React.RefObject<HTMLElement>,
      cta: ctaRef as React.RefObject<HTMLElement>,
    };
    const el = map[step.target]?.current;
    const host = sectionRef.current;
    if (!el || !host) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      setRing({ x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tour, tourOn]);

  const endTour = () => {
    setTourOn(false);
    setRing(null);
  };

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100svh] lg:min-h-[92vh] flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-24 lg:pt-28"
      style={{ touchAction: "pan-y", background: "rgb(var(--color-void) / 1)" }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--color-void, #03020a)" }} />
        <div
          className="absolute inset-0"
          style={{
            opacity: "var(--grid-opacity, 0.04)",
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 80%)",
          }}
        />
        <motion.div
          aria-hidden
          className="absolute h-[42vmax] w-[42vmax] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.16), rgba(34,211,238,0.07) 45%, transparent 70%)",
            filter: "blur(60px)",
            top: "-6%",
            left: "-6%",
          }}
          animate={
            reduce
              ? { x: "30vw", y: "20vh" }
              : { x: ["0vw", "60vw", "25vw", "70vw", "0vw"], y: ["0vh", "40vh", "65vh", "15vh", "0vh"] }
          }
          transition={reduce ? { duration: 0 } : { duration: 38, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute h-[30vmax] w-[30vmax] rounded-full"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10), transparent 70%)",
            filter: "blur(70px)",
            bottom: "-10%",
            right: "-8%",
          }}
          animate={reduce ? { x: 0, y: 0 } : { x: ["0vw", "-35vw", "-10vw", "0vw"], y: ["0vh", "-30vh", "-55vh", "0vh"] }}
          transition={reduce ? { duration: 0 } : { duration: 46, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div
        className="reveal-up relative z-10 mb-7 flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-xl"
        style={{ borderColor: "rgb(var(--color-border-strong))", background: "rgb(var(--glass-bg))" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "rgb(var(--color-on-surface-variant, 168 159 212))" }}
        >
          La fábrica de apps con IA
        </span>
      </div>

      <h1
        ref={headRef}
        className="reveal-up relative z-10 text-center text-[clamp(2.2rem,7vw,4.4rem)] font-bold leading-[0.95] tracking-[-0.04em]"
        style={{ color: "var(--color-on-surface, #e8e4ff)", animationDelay: "0.06s" }}
      >
        Construye.{" "}
        <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
          Despliega.
        </span>{" "}
        Domina.
      </h1>

      <p
        className="reveal-up relative z-10 mt-6 max-w-[440px] text-center text-[clamp(0.95rem,2.4vw,1.1rem)] font-light leading-relaxed"
        style={{ color: "var(--color-on-surface-variant, #a89fd4)", animationDelay: "0.12s" }}
      >
        Dos piezas, un sistema: la <span style={{ color: "var(--color-on-surface)" }}>forja</span> que
        despliega tu producto y la <span style={{ color: "var(--color-on-surface)" }}>IA</span> que lo
        construye contigo.
      </p>

      <div className="relative z-10 mt-12 grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {SPHERES.map((s, i) => {
          const ref = s.id === "forge" ? forgeRef : vulcanoRef;
          const isActive = active === s.id;
          return (
            <div
              key={s.id}
              ref={ref}
              onMouseEnter={() => setActive(s.id)}
              onMouseLeave={() => setActive((a) => (a === s.id ? null : a))}
              onClick={() => setActive((a) => (a === s.id ? null : s.id))}
              className="reveal-up group relative flex cursor-pointer flex-col items-center rounded-3xl border p-6 text-center backdrop-blur-xl transition-colors"
              style={{
                borderColor: isActive ? `${s.accent}55` : "rgb(var(--color-border))",
                background: "rgb(var(--glass-bg))",
                boxShadow: isActive ? `0 0 50px ${s.accent}22` : "none",
                animationDelay: `${0.18 + i * 0.1}s`,
              }}
            >
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, ${s.accent}33, transparent 70%)`, filter: "blur(34px)" }}
                animate={reduce ? { opacity: 0.5 } : { opacity: isActive ? [0.5, 0.85, 0.5] : 0.4, scale: isActive ? [1, 1.12, 1] : 1 }}
                transition={reduce ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative h-32 w-32">
                <motion.img
                  src={s.img}
                  alt={s.name}
                  draggable={false}
                  className="h-full w-full object-contain"
                  style={{ filter: `drop-shadow(0 0 30px ${s.accent}66)` }}
                  animate={reduce ? { y: 0 } : { y: [0, -8, 0] }}
                  transition={reduce ? { duration: 0 } : { duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
                />
                <AnimatePresence>
                  {isActive && !reduce && (
                    <motion.div
                      key="scan"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                    >
                      <motion.div
                        className="absolute left-0 h-[2px] w-full"
                        style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }}
                        animate={{ top: ["8%", "92%", "8%"] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: s.accent }}>
                {s.eyebrow}
              </p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
                {s.id === "forge" ? <IconBag size={16} style={{ color: s.accent }} /> : <IconBot size={16} style={{ color: s.accent }} />}
                {s.name}
              </h3>
              <p className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                {s.tagline}
              </p>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 flex items-center gap-1.5 overflow-hidden text-[10px]"
                    style={{ color: s.accent }}
                  >
                    <IconActivity size={11} />
                    <span>{s.action}</span>
                    <motion.span animate={reduce ? {} : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      •••
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 10, height: 0 }}
                    transition={{ ease: EASE, duration: 0.35 }}
                    className="mt-4 w-full overflow-hidden text-left"
                  >
                    <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
                      {s.what}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-on-surface)" }}>
                          <span className="h-1 w-1 rounded-full" style={{ background: s.accent }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-transform active:scale-95"
                          style={
                            l.primary
                              ? { background: s.accent, color: "#06040f" }
                              : { border: `1px solid ${s.accent}40`, color: s.accent }
                          }
                        >
                          {l.label}
                          <IconArrowR size={12} />
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isActive && (
                <p className="mt-3 text-[10px]" style={{ color: "var(--color-muted, #6b628f)" }}>
                  Pasa el cursor para ver qué hace
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div ref={ctaRef} className="relative z-10 mt-12 flex w-full max-w-sm flex-col items-center gap-3">
        <Link
          href="/sign-up"
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 px-8 py-4 text-base font-semibold text-white shadow-[0_8px_40px_rgba(124,58,237,0.45)] transition-all hover:shadow-[0_8px_60px_rgba(124,58,237,0.65)] active:scale-[0.98]"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <IconSparkles size={17} className="relative text-cyan-200" />
          <span className="relative">Empieza gratis</span>
          <IconArrowR size={17} className="relative transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/vulcano"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-base font-medium backdrop-blur-sm transition-all hover:text-white"
          style={{ borderColor: "rgb(var(--color-border))", background: "rgb(var(--glass-bg))", color: "var(--color-on-surface-variant)" }}
        >
          <IconRocket size={16} /> Conoce a Vulcano
        </Link>
      </div>

      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]" style={{ color: "var(--color-muted)" }}>
        <span className="flex items-center gap-1.5"><span className="text-cyan-400/80">✓</span> Sin tarjeta</span>
        <span className="h-3 w-px" style={{ background: "rgb(var(--color-border))" }} />
        <span className="flex items-center gap-1.5"><span className="text-cyan-400/80">✓</span> Deploy en segundos</span>
        <span className="h-3 w-px" style={{ background: "rgb(var(--color-border))" }} />
        <span className="flex items-center gap-1.5"><span className="text-cyan-400/80">✓</span> 17+ apps en producción</span>
      </div>

      <AnimatePresence>
        {tourOn && ring && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: ring.x - 10, top: ring.y - 10, width: ring.w + 20, height: ring.h + 20 }}
            exit={{ opacity: 0 }}
            transition={{ ease: EASE, duration: 0.6 }}
            className="pointer-events-none absolute z-20 rounded-3xl border-2"
            style={{ borderColor: "rgba(34,211,238,0.55)", boxShadow: "0 0 40px rgba(34,211,238,0.25)" }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tourOn && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ ease: EASE, duration: 0.4 }}
            className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5 backdrop-blur-2xl"
            style={{
              borderColor: "rgba(34,211,238,0.25)",
              background: "rgb(var(--glass-bg-strong))",
              boxShadow: "0 -10px 50px rgba(0,0,0,0.5)",
              width: "calc(100% - 2rem)",
            }}
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(34,211,238,0.15)" }}>
              <IconSparkles size={14} className="text-cyan-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {TOUR[tour].title}
                </p>
                <div className="flex items-center gap-1">
                  {TOUR.map((_, i) => (
                    <span
                      key={i}
                      className="h-1 rounded-full transition-all"
                      style={{ width: i === tour ? 14 : 5, background: i === tour ? "#22d3ee" : "rgb(var(--color-border-strong))" }}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-[12px] leading-snug" style={{ color: "var(--color-on-surface-variant)" }}>
                {TOUR[tour].body}
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                {tour < TOUR.length - 1 ? (
                  <button onClick={() => setTour((s) => s + 1)} className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                    Siguiente <IconArrowR size={11} />
                  </button>
                ) : (
                  <button onClick={endTour} className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
                    Explorar <IconArrowR size={11} />
                  </button>
                )}
                <button onClick={endTour} className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                  Saltar guía
                </button>
              </div>
            </div>
            <button onClick={endTour} aria-label="Cerrar guía" className="shrink-0" style={{ color: "var(--color-muted)" }}>
              <IconX size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
