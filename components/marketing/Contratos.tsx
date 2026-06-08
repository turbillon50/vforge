"use client";

import { motion } from "framer-motion";
import { FileSignature, ShieldCheck, Clock, PenTool } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { icon: FileSignature, title: "Contrato digital", desc: "Generamos tu contrato con todo el alcance, etapas y pagos claros." },
  { icon: PenTool, title: "Firma electrónica", desc: "Firmas desde tu celular en segundos. Validez legal con DocuSign." },
  { icon: ShieldCheck, title: "Protección total", desc: "Ambas partes protegidas. Entregables y plazos por escrito." },
  { icon: Clock, title: "Seguimiento en vivo", desc: "El contrato se conecta a tu portal: ves avance y pagos en tiempo real." },
];

export function Contratos() {
  return (
    <section data-theme="dark" id="contratos" className="relative py-20">
      <div className="mx-auto max-w-5xl px-5">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#0c0a1a] to-[#06040f] p-8 md:p-12">
          {/* Glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-[100px]" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                Todo por escrito
              </span>
            </div>
            <h2 className="mt-4 text-[clamp(1.6rem,4.5vw,2.6rem)] font-bold leading-tight tracking-tight text-white">
              Contratos claros,<br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">firma sin papel.</span>
            </h2>
            <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/50">
              Cada proyecto arranca con un contrato digital firmado electrónicamente. Transparente, legal y conectado a tu portal de seguimiento.
            </p>

            <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, ease: EASE }}
                  className="group flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-all hover:border-violet-400/30 hover:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 transition-all group-hover:scale-110">
                    <s.icon size={18} className="text-violet-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/45">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-7 flex items-center gap-2 text-xs text-white/30">
              <ShieldCheck size={13} className="text-cyan-400/70" />
              Firma electrónica con validez legal · Powered by DocuSign
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
