"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  { n: "01", t: "Conecta tu mundo", d: "Pegas tus herramientas — WhatsApp, pagos, tu base de datos, lo que uses. Se enlazan solas por MCP." },
  { n: "02", t: "Le hablas a tu agente", d: "En palabras normales. Él arma tus apps, automatizaciones y procesos por ti." },
  { n: "03", t: "Tú controlas todo", d: "Ves, apruebas y mandas desde un solo lugar. Sin código, sin caos." },
];

export function Metodo() {
  return (
    <section id="metodo" className="border-b border-app bg-void py-24 md:py-32">
      <div className="mx-auto max-w-container px-5 md:px-margin-desktop">
        <motion.div initial={false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5 }} className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-cyber-cyan">Cómo funciona</p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-on-surface md:text-5xl">
            Un agente. Tu mundo conectado. <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">Tres pasos.</span>
          </h2>
        </motion.div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-app bg-app md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.n} initial={false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5, delay: i * 0.1 }} className="bg-void p-8">
              <span className="font-mono text-sm text-violet-300">{s.n}</span>
              <h3 className="mt-4 font-display text-xl font-semibold text-on-surface">{s.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant">{s.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-12">
          <Link href="/sign-up" className="btn-primary !px-7 !py-3.5 text-[15px]">
            Crear cuenta gratis <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
