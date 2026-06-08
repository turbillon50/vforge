"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, Sparkles, Play } from "lucide-react";

const APPS = [
  { name: "APSUS", cat: "Fintech", color: "#7c3aed", img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80", status: "live" },
  { name: "CSN Carnes", cat: "E-Commerce", color: "#dc2626", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80", status: "live" },
  { name: "MT Empresarial", cat: "Transporte", color: "#0891b2", img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80", status: "live" },
  { name: "Yerro Fiscal", cat: "Legal Tech", color: "#059669", img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80", status: "live" },
  { name: "Happytoc", cat: "Bienestar", color: "#d97706", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80", status: "live" },
  { name: "LN Red", cat: "Eventos", color: "#7c3aed", img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80", status: "live" },
  { name: "iStore Pro", cat: "SaaS", color: "#0891b2", img: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400&q=80", status: "building" },
  { name: "RideMe", cat: "Movilidad", color: "#059669", img: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=80", status: "building" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const HF_SPHERE = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_082007_063c8411-35b1-4eb4-a5b3-bc7c5bd62f50.png";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const sphereY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const sphereScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.85]);
  const sphereOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const [activeApp, setActiveApp] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveApp(p => (p + 1) % APPS.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden pb-0">

      {/* Fondo: gradiente radial dark */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#03020a]" />
        <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/8 blur-[100px]" />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }}
        />
      </div>

      {/* ESFERA HIGGSFIELD — protagonista */}
      <motion.div
        style={{ y: sphereY, scale: sphereScale, opacity: sphereOpacity }}
        className="relative mb-6 mt-16 flex items-center justify-center"
      >
        {/* Halo exterior pulsante */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-[320px] w-[320px] rounded-full bg-violet-600/20 blur-[60px]"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-[80px]"
        />

        {/* Anillo orbital */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute h-[260px] w-[260px] rounded-full border border-violet-400/20"
        >
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          className="absolute h-[290px] w-[290px] rounded-full border border-cyan-400/10"
        >
          <div className="absolute bottom-0 right-4 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        </motion.div>

        {/* Esfera imagen Higgsfield */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-[200px] w-[200px] overflow-hidden rounded-full"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset, 0 20px 80px rgba(124,58,237,0.7), 0 0 120px rgba(124,58,237,0.3)",
          }}
        >
          {/* Imagen Higgsfield */}
          <img
            src={HF_SPHERE}
            alt="V"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "40% 30%" }}
          />
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent backdrop-blur-[1px]" />
          {/* Reflejo gloss */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(ellipse at 32% 25%, rgba(255,255,255,0.5) 0%, rgba(200,180,255,0.2) 25%, transparent 55%)", mixBlendMode: "screen" }}
          />
          {/* Borde cristal */}
          <div className="absolute inset-0 rounded-full border border-white/15" />
        </motion.div>

        {/* Badge "V está en línea" */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, ease: EASE }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-violet-400/30 bg-[#0a0614]/80 px-3 py-1 backdrop-blur-xl"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-violet-300 uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            V en línea
          </span>
        </motion.div>
      </motion.div>

      {/* TEXTO HERO */}
      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: EASE }}
          className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-violet-400/70 uppercase"
        >
          La fábrica de apps con IA
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ease: EASE }}
          className="text-[clamp(2.8rem,10vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white"
        >
          Construye.
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
            Despliega.
          </span>
          <br />
          Domina.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, ease: EASE }}
          className="mt-5 max-w-[400px] text-[clamp(0.9rem,2.5vw,1.05rem)] font-light leading-relaxed text-white/50"
        >
          V conoce tu stack, tus repos y tus clientes.
          Hablas — ella construye. Tú controlas todo.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, ease: EASE }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/sign-up"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_rgba(124,58,237,0.5)] transition-all hover:shadow-[0_0_60px_rgba(124,58,237,0.7)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-300" />
              Empieza gratis
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <Link
            href="#metodo"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:border-violet-400/30 hover:bg-white/[0.08] hover:text-white"
          >
            <Play size={13} className="text-violet-400" />
            Ver el método
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, ease: EASE }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-white/25"
        >
          <span className="flex items-center gap-1.5"><span className="text-cyan-400/60">✓</span> Sin tarjeta</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5"><span className="text-cyan-400/60">✓</span> Deploy en segundos</span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5"><span className="text-cyan-400/60">✓</span> 17+ apps en producción</span>
        </motion.div>
      </div>

      {/* CARRUSEL DE APPS — Apple TV style */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, ease: EASE }}
        className="relative mt-16 w-full overflow-hidden"
      >
        <p className="mb-4 text-center text-[11px] font-semibold tracking-[0.2em] text-white/20 uppercase">Apps construidas con V</p>
        <div className="flex gap-3 px-4 pb-6 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {APPS.map((app, i) => (
            <motion.div
              key={app.name}
              animate={{
                scale: activeApp === i ? 1 : 0.94,
                opacity: activeApp === i ? 1 : 0.55,
              }}
              transition={{ duration: 0.5, ease: EASE }}
              className="relative h-48 w-36 shrink-0 snap-center overflow-hidden rounded-2xl border border-white/10 cursor-pointer"
              onClick={() => setActiveApp(i)}
              style={{ boxShadow: activeApp === i ? `0 8px 40px ${app.color}60` : "none" }}
            >
              {/* Imagen splash */}
              <img src={app.img} alt={app.name} className="absolute inset-0 h-full w-full object-cover" />
              {/* Overlay degradado */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              {/* Borde activo */}
              {activeApp === i && (
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset" style={{ ringColor: app.color + "80" }} />
              )}
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: app.color }}>{app.cat}</p>
                <p className="text-sm font-bold text-white leading-tight">{app.name}</p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${app.status === "live" ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-300"}`}>
                  <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
                  {app.status === "live" ? "Live" : "En progreso"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#03020a] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#03020a] to-transparent" />
      </motion.div>
    </section>
  );
}
