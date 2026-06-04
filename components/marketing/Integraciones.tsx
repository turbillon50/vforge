"use client";

import { motion } from "framer-motion";

const INTEGRATIONS = [
  { n: "GitHub", d: "Tu código", c: "#e7ecf6" },
  { n: "Vercel", d: "Deploy en vivo", c: "#ffffff" },
  { n: "v0", d: "UI al instante", c: "#a78bfa" },
  { n: "Claude", d: "El cerebro", c: "#d97757" },
  { n: "GPT", d: "Generación", c: "#34d399" },
  { n: "n8n", d: "Automatización", c: "#ef6c5a" },
  { n: "Stripe", d: "Pagos", c: "#8b5cf6" },
  { n: "Airtable", d: "Datos", c: "#22d3ee" },
  { n: "ElevenLabs", d: "Voz", c: "#e7ecf6" },
];

export function Integraciones() {
  return (
    <section className="border-b border-app bg-void py-20 md:py-28">
      <div className="mx-auto max-w-container px-5 md:px-margin-desktop">
        <p className="label-caps mb-3 text-cyber-cyan">Conecta tu mundo</p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface md:text-5xl">
          Todo tu stack, <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">en un solo lugar.</span>
        </h2>
        <p className="mt-4 max-w-xl text-[15px] text-on-surface-variant">Deslízate. Conectas tus herramientas y V las orquesta por ti.</p>
      </div>
      <div className="mt-10 flex gap-4 overflow-x-auto px-5 pb-4 md:px-margin-desktop [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: "x mandatory" }}>
        {INTEGRATIONS.map((it, i) => (
          <motion.div
            key={it.n}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
            style={{ scrollSnapAlign: "start" }}
            className="group relative flex h-44 w-40 flex-none flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:border-violet-400/40 hover:bg-white/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold" style={{ background: it.c + "22", color: it.c }}>
              {it.n.slice(0, 2)}
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-on-surface">{it.n}</p>
              <p className="text-[13px] text-on-surface-variant">{it.d}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
