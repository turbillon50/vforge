"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, ArrowUpRight } from "lucide-react";
import { INTEGRATIONS, type Integration } from "./integrations-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Integraciones() {
  const [active, setActive] = useState<Integration | null>(null);

  // Bloquea el scroll del body cuando el sheet esta abierto.
  useEffect(() => {
    if (active) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [active]);

  // Cierra con Escape.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section id="integraciones" className="border-b border-app bg-void py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-margin-desktop">
        <p className="label-caps mb-3 text-cyber-cyan">Conecta tu mundo</p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface md:text-5xl">
          Todo tu stack,{" "}
          <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
            en un solo lugar.
          </span>
        </h2>
        <p className="mt-4 max-w-xl text-[15px] text-on-surface-variant">
          Deslizate. Toca cualquier servicio para conocerlo y conectarlo. V los orquesta por ti.
        </p>
      </div>

      <div
        className="no-scrollbar mt-10 flex gap-4 overflow-x-auto px-5 pb-6 md:px-margin-desktop"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {INTEGRATIONS.map((it, i) => (
          <motion.button
            key={it.id}
            type="button"
            onClick={() => setActive(it)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: EASE, delay: (i % 4) * 0.06 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ scrollSnapAlign: "start" }}
            className="group relative flex h-52 w-44 flex-none flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border border-app bg-surface/60 p-6 text-center backdrop-blur-xl transition-colors hover:border-app-strong"
          >
            {/* highlight 1px inset arriba */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {/* glow de marca detras del logo */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[38%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
              style={{ background: it.brandColor }}
            />
            <span
              className="relative flex h-14 w-14 items-center justify-center"
              style={{ color: it.brandColor }}
            >
              <it.Logo className="h-11 w-11 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
            </span>
            <span className="relative font-display text-[17px] font-semibold text-on-surface">
              {it.name}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setActive(null)}
              className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={active.name}
              initial={{ y: "100%", opacity: 0.6, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl border border-app bg-surface/95 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-7"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              {/* glow de marca */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-10 left-8 h-32 w-32 rounded-full opacity-30 blur-3xl"
                style={{ background: active.brandColor }}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl border border-app bg-tint-1"
                    style={{ color: active.brandColor }}
                  >
                    <active.Logo className="h-9 w-9" />
                  </span>
                  <h3 className="font-display text-2xl font-bold text-on-surface">
                    {active.name}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setActive(null)}
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-app bg-tint-1 text-on-surface-variant transition hover:bg-tint-2 hover:text-on-surface"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="relative mt-5 text-[15px] leading-relaxed text-on-surface-variant">
                {active.blurb}
              </p>

              {active.video && (
                <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-app bg-void">
                  <iframe
                    src={active.video}
                    title={`Video oficial de ${active.name}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              )}

              <Link
                href={active.connectHref}
                className="relative mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg transition hover:brightness-110"
                style={{
                  background: `linear-gradient(135deg, ${active.brandColor}, #22d3ee 140%)`,
                }}
              >
                Conectar {active.name}
                <ArrowUpRight size={16} />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
