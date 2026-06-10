"use client";

import { useState } from "react";
import Link from "next/link";
import { IconCheck, IconSparkles, IconZap, IconCrown, IconArrowR } from "@/components/brand/VFIcons";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const PLANS = [
  {
    id: "free",
    name: "Explorer",
    price: { monthly: "$0", annual: "$0" },
    cadence: "/mes · siempre gratis",
    blurb: "Conoce a V. Explora el workspace. Construye tu primer proyecto.",
    icon: IconSparkles,
    iconColor: "text-violet-300",
    features: [
      "1 workspace activo",
      "20 mensajes/día con V",
      "Conexión GitHub + Vercel",
      "Marketplace comunitario",
      "Despliegue básico incluido",
      "Soporte por documentación",
    ],
    cta: "Empieza gratis",
    ctaHref: "/sign-up",
    highlight: false,
  },
  {
    id: "studio",
    name: "Studio",
    price: { monthly: "$30", annual: "$24" },
    cadence: "/mes",
    blurb: "Para fundadores que envían productos reales cada semana. El plan de los que construyen en serio.",
    icon: IconZap,
    iconColor: "text-cyan-300",
    features: [
      "5 workspaces activos",
      "Mensajes ilimitados con V",
      "Builds y despliegues sin límite",
      "Bóveda de secretos encriptada",
      "Dominios personalizados",
      "Panel de clientes (invitación)",
      "Acceso a V-Shop completo",
      "Integraciones premium (Stripe, MP, Clerk)",
      "Notificaciones push VAPID",
      "Soporte prioritario por chat",
    ],
    cta: "Elegir Studio",
    ctaHref: "/sign-up?plan=studio",
    highlight: true,
    badge: "Más popular",
  },
  {
    id: "forge",
    name: "Forge",
    price: { monthly: "$60", annual: "$48" },
    cadence: "/mes",
    blurb: "Para operadores con portafolio completo. Todo lo de Studio más potencia de agencia.",
    icon: IconCrown,
    iconColor: "text-yellow-300",
    features: [
      "Workspaces ilimitados",
      "Multi-cliente con alcances",
      "Acceso Owner completo",
      "Contratos digitales (DocuSign)",
      "Marca blanca disponible",
      "API propia de V",
      "Analítica avanzada de proyectos",
      "V-Shop: subir tus propias apps",
      "Soporte directo con el equipo",
      "Acceso beta a nuevas funciones",
    ],
    cta: "Elegir Forge",
    ctaHref: "/sign-up?plan=forge",
    highlight: false,
  },
];

const COMPARISON = [
  { feature: "Workspaces", free: "1", studio: "5", forge: "∞" },
  { feature: "Mensajes con V", free: "20/día", studio: "Ilimitados", forge: "Ilimitados" },
  { feature: "Despliegues", free: "Básico", studio: "Sin límite", forge: "Sin límite" },
  { feature: "Panel de clientes", free: "—", studio: "✓", forge: "✓" },
  { feature: "Acceso a V-Shop", free: "Explorar", studio: "Completo", forge: "Completo + carga" },
  { feature: "Contratos digitales", free: "—", studio: "—", forge: "✓" },
  { feature: "Marca blanca", free: "—", studio: "—", forge: "✓" },
  { feature: "API de V", free: "—", studio: "—", forge: "✓" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] pb-24 pt-24">

        {/* Header */}
        <div className="mx-auto max-w-4xl px-5 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-violet-400/70 uppercase"
          >
            Planes y precios
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ease: EASE }}
            className="text-[clamp(2.2rem,7vw,4rem)] font-bold leading-tight tracking-tight text-white"
          >
            El poder de una agencia.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              El precio de una herramienta.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mt-4 max-w-lg text-base font-light text-white/40"
          >
            Sin contratos, sin sorpresas. Cancela cuando quieras.
          </motion.p>

          {/* Toggle anual */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm"
          >
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${!annual ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "text-white/40 hover:text-white/70"}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all ${annual ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "text-white/40 hover:text-white/70"}`}
            >
              Anual
              <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400">-20%</span>
            </button>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 px-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4, ease: EASE }}
              className={`relative flex flex-col overflow-hidden rounded-3xl border p-7 transition-all ${
                plan.highlight
                  ? "border-violet-400/50 bg-gradient-to-b from-violet-600/15 to-[#080614] shadow-[0_0_80px_rgba(124,58,237,0.2),0_0_0_1px_rgba(124,58,237,0.3)] scale-[1.03]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="rounded-b-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-1 text-[11px] font-bold text-white tracking-widest uppercase shadow-[0_4px_20px_rgba(124,58,237,0.5)]">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] ${plan.iconColor}`}>
                    <plan.icon size={16} />
                  </div>
                  <p className="text-lg font-bold text-white">{plan.name}</p>
                  <p className="mt-1 text-xs font-light text-white/40">{plan.blurb}</p>
                </div>
              </div>

              <div className="mt-6">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {annual ? plan.price.annual : plan.price.monthly}
                </span>
                <span className="ml-1 text-sm text-white/30">{plan.cadence}</span>
              </div>

              <Link href={plan.ctaHref}
                className={`mt-6 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)] hover:scale-[1.02]"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white"
                }`}
              >
                {plan.cta}
                <IconArrowR size={13} />
              </Link>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                    <IconCheck size={13} className="mt-0.5 shrink-0 text-cyan-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Tabla comparativa */}
        <div className="mx-auto mt-20 max-w-4xl px-5">
          <p className="mb-6 text-center text-[11px] font-semibold tracking-[0.2em] text-white/25 uppercase">Comparativa detallada</p>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-white/30 uppercase tracking-widest">Feature</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-white/30 uppercase tracking-widest">Explorer</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-violet-300 uppercase tracking-widest">Studio</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-yellow-300/70 uppercase tracking-widest">Forge</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-5 py-3.5 text-white/60">{row.feature}</td>
                    <td className="px-4 py-3.5 text-center text-white/35">{row.free}</td>
                    <td className="px-4 py-3.5 text-center text-violet-300">{row.studio}</td>
                    <td className="px-4 py-3.5 text-center text-yellow-300/70">{row.forge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ mínimo */}
        <div className="mx-auto mt-16 max-w-2xl px-5 text-center">
          <p className="text-sm text-white/30">
            ¿Tienes dudas? Habla con <Link href="/sign-up" className="text-violet-400 hover:underline">V directamente</Link> — te explica todo en segundos.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
