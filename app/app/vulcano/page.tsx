"use client";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function VulcanoPage() {
  return (
    <>
      <PageHeader
        eyebrow="NAVEGADOR"
        title="Navegador autónomo"
        description="Las Esferas Vulcano navegan la web, extraen datos y ejecutan tareas en tu nombre desde Hetzner."
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-24 md:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <motion.span className="absolute inset-0 rounded-2xl border border-violet-400/30" animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.1 }} className="text-center">
          <p className="font-display text-xl font-semibold text-on-surface">Próximamente</p>
          <p className="mt-2 max-w-sm text-sm text-on-surface-variant opacity-70">
            El navegador autónomo de VForge ejecutará sesiones de browser en Hetzner — scraping, testing y automatización web sin salir del workspace.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.2 }} className="mt-2 grid w-full max-w-md grid-cols-1 gap-2">
          {[
            { icon: "🌐", label: "Sesiones Playwright/Puppeteer remotas" },
            { icon: "📊", label: "Scraping estructurado con AI" },
            { icon: "🤖", label: "Automatización de formularios y flujos" },
            { icon: "📸", label: "Screenshots y grabaciones de sesión" },
          ].map((feat, i) => (
            <motion.div key={feat.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.25 + i * 0.06 }} className="flex items-center gap-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
              <span className="text-base">{feat.icon}</span>
              <span className="text-[13px] text-on-surface-variant">{feat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  );
}
