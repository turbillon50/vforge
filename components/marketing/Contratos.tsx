"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

// SVG inline — cero Lucide
const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconPen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconShieldSm = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const STEPS = [
  { Icon: IconDoc,    title: "Contrato digital",     desc: "Generamos tu contrato con todo el alcance, etapas y pagos claros." },
  { Icon: IconPen,    title: "Firma electrónica",     desc: "Firmas desde tu celular en segundos. Validez legal con DocuSign." },
  { Icon: IconShield, title: "Protección total",      desc: "Ambas partes protegidas. Entregables y plazos por escrito." },
  { Icon: IconEye,    title: "Seguimiento en vivo",   desc: "El contrato se conecta a tu portal: ves avance y pagos en tiempo real." },
];

export function Contratos() {
  return (
    <section data-theme="dark" id="contratos" className="relative py-14 md:py-16">
      <div className="mx-auto max-w-5xl px-5">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--border-1)] bg-gradient-to-br from-[#0c0a1a] to-[#06040f] p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-[100px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />

          <div className="relative">
            <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
              Todo por escrito
            </span>
            <h2 className="mt-4 text-[clamp(1.6rem,4.5vw,2.6rem)] font-bold leading-tight tracking-tight text-white">
              Contratos claros,<br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                firma sin papel.
              </span>
            </h2>
            <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-[var(--fg-tertiary)]">
              Cada proyecto arranca con un contrato digital firmado electrónicamente.
              Transparente, legal y conectado a tu portal de seguimiento.
            </p>

            <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <motion.div key={s.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, ease: EASE }}
                  className="group flex items-start gap-3 rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] p-4 transition-all hover:border-violet-400/30 hover:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300 transition-all group-hover:scale-110 group-hover:bg-violet-500/20">
                    <s.Icon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-tertiary)]">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-7 flex items-center gap-2 text-xs text-[var(--fg-muted)]">
              <span className="text-cyan-400/70"><IconShieldSm /></span>
              Firma electrónica con validez legal · Respaldado por DocuSign
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
