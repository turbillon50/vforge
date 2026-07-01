"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { IconConstruction, IconClock, IconSparkles, IconArrowR, IconCheck } from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;
const HF_SPHERE = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_082007_60084359-8811-4bc5-8d6b-a3ab56409de3.png";

const FEATURES_COMING = [
  "Portal de desarrolladores con documentación técnica completa",
  "Acceso a la API pública de V",
  "Entorno sandbox para probar integraciones sin producción",
  "Foro de comunidad y soporte técnico entre desarrolladores",
  "Acceso anticipado a nuevas funciones y modelos de IA",
  "Reparto de ingresos en el marketplace V-Shop",
];

export default function DeveloperPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // En prod: POST /api/waitlist
    setSent(true);
  };

  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] pb-24 pt-24">
        <div className="mx-auto max-w-2xl px-5 text-center">

          {/* Esfera bajo construcción */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ease: EASE }}
            className="relative mx-auto mb-8 h-[140px] w-[140px]"
          >
            <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="relative h-full w-full overflow-hidden rounded-full" style={{ boxShadow: "0 0 60px rgba(124,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset" }}>
              <img src={HF_SPHERE} alt="" className="h-full w-full object-cover opacity-70" style={{ objectPosition: "40% 30%" }} />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <IconConstruction size={28} className="text-violet-300" />
              </div>
            </div>
            {/* Anillo */}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-[-16px] rounded-full border border-dashed border-violet-400/20" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: EASE }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300">
              <IconClock size={11} /> Próximamente
            </div>
            <h1 className="text-[clamp(2rem,7vw,3.5rem)] font-bold leading-tight tracking-tight text-white">
              Portal<br />
              <span className="bg-gradient-to-r from-violet-400 to-violet-400 bg-clip-text text-transparent">Desarrolladores</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base font-light text-[var(--fg-tertiary)]">
              Estamos construyendo el espacio definitivo para desarrolladores que quieren integrar, extender y monetizar con V.
            </p>
          </motion.div>

          {/* Features próximas */}
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ease: EASE }}
            className="mt-8 space-y-2.5 text-left"
          >
            {FEATURES_COMING.map((f, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--fg-tertiary)]">
                <IconSparkles size={13} className="mt-0.5 shrink-0 text-violet-400/60" />
                {f}
              </li>
            ))}
          </motion.ul>

          {/* Waitlist form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, ease: EASE }}
            className="mt-10 rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/10 to-[#080614] p-6"
          >
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15">
                  <IconCheck size={20} className="text-emerald-400" />
                </div>
                <p className="font-semibold text-white">¡Estás en la lista!</p>
                <p className="text-sm text-[var(--fg-tertiary)]">Te avisamos cuando abra el portal de desarrolladores. Serás de los primeros.</p>
              </div>
            ) : (
              <>
                <p className="mb-1 font-semibold text-white">Únete a la lista de espera</p>
                <p className="mb-5 text-sm text-[var(--fg-muted)]">Sé de los primeros cuando abramos acceso.</p>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="flex-1 rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-400/50 focus:bg-white/[0.08]"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:scale-[1.02] transition-transform"
                  >
                    Quiero acceso <IconArrowR size={13} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
