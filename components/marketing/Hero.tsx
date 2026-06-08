"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Play } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPHERE = "/sphere-violet.png";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-28">

      {/* Fondo obsidian con aura */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[var(--color-void)]" />
        <div className="absolute left-1/2 top-[28%] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute left-1/2 top-[30%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[80px]" />
      </div>

      {/* ESFERA — protagonista absoluta, sin órbitas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        className="relative mb-2 flex items-center justify-center"
      >
        {/* Glow detrás de la esfera */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-[300px] w-[300px] rounded-full bg-violet-600/30 blur-[70px]"
        />

        {/* La esfera flotando */}
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-[clamp(200px,58vw,300px)] w-[clamp(200px,58vw,300px)]"
        >
          <img
            src={SPHERE}
            alt="V"
            className="h-full w-full object-contain"
            style={{ filter: "drop-shadow(0 0 60px rgba(124,58,237,0.6)) drop-shadow(0 0 120px rgba(124,58,237,0.3))" }}
          />
        </motion.div>
      </motion.div>

      {/* Badge V en línea */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, ease: EASE }}
        className="mb-6 flex items-center gap-2 rounded-full border border-violet-400/30 bg-tint-2 px-4 py-1.5 backdrop-blur-xl"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-200 uppercase">V en línea</span>
      </motion.div>

      {/* Texto */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, ease: EASE }}
        className="mb-4 text-center text-[11px] font-semibold tracking-[0.25em] text-violet-400/60 uppercase"
      >
        La fábrica de apps con IA
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, ease: EASE }}
        className="text-center text-[clamp(3rem,13vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em] text-on-surface"
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
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.25, ease: EASE }}
        className="mt-6 max-w-[420px] text-center text-[clamp(0.95rem,2.6vw,1.1rem)] font-light leading-relaxed text-on-surface-variant"
      >
        V conoce tu stack, tus repos y tus clientes.
        Hablas — ella construye. Tú controlas todo.
      </motion.p>

      {/* CTAs premium */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, ease: EASE }}
        className="mt-9 flex w-full max-w-sm flex-col items-center gap-3"
      >
        <Link
          href="/sign-up"
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 px-8 py-4 text-base font-semibold text-white shadow-[0_8px_40px_rgba(124,58,237,0.5)] transition-all hover:shadow-[0_8px_60px_rgba(124,58,237,0.7)] active:scale-[0.98]"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <Sparkles size={17} className="relative text-cyan-200" />
          <span className="relative">Empieza gratis</span>
          <ArrowRight size={17} className="relative transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="#metodo"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-app bg-tint-1 px-8 py-4 text-base font-medium text-on-surface-variant backdrop-blur-sm transition-all hover:border-violet-400/30 hover:bg-tint-2 hover:text-on-surface"
        >
          <Play size={15} className="text-violet-400" />
          Ver el método
        </Link>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, ease: EASE }}
        className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-white/30"
      >
        <span className="flex items-center gap-1.5"><span className="text-cyan-400/70">✓</span> Sin tarjeta</span>
        <span className="h-3 w-px bg-white/10" />
        <span className="flex items-center gap-1.5"><span className="text-cyan-400/70">✓</span> Deploy en segundos</span>
        <span className="h-3 w-px bg-white/10" />
        <span className="flex items-center gap-1.5"><span className="text-cyan-400/70">✓</span> 17+ apps en producción</span>
      </motion.div>
    </section>
  );
}
