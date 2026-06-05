"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, Zap, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

type PaidPlan = "studio" | "forge" | "payg";

interface PlanCard {
  id: "free" | PaidPlan;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  hero?: boolean;
}

const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "/mes",
    blurb: "Empieza gratis. Conoce a V y construye tu primer espacio.",
    features: [
      "1 workspace",
      "20 mensajes al día con V",
      "Conexión GitHub + Vercel",
      "Marketplace comunitario",
    ],
    cta: "Empieza gratis",
    hero: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "$20",
    cadence: "/mes",
    blurb: "Para fundadores que envían productos reales cada semana.",
    features: [
      "5 workspaces",
      "200 mensajes al día con V",
      "Builds y deploys incluidos",
      "Bóveda de secretos",
      "Dominios personalizados",
    ],
    cta: "Elegir Studio",
    highlight: true,
  },
  {
    id: "forge",
    name: "Forge",
    price: "$100",
    cadence: "/mes",
    blurb: "Para operadores con un portafolio completo a escala.",
    features: [
      "Workspaces ilimitados",
      "Mensajes ilimitados con V",
      "Builds con prioridad",
      "Auditoría y aprobaciones",
      "Soporte dedicado",
    ],
    cta: "Elegir Forge",
  },
  {
    id: "payg",
    name: "Pay-as-you-go",
    price: "$0",
    cadence: "base + uso",
    blurb: "Paga solo lo que V ejecuta. $1 por unidad de cómputo.",
    features: [
      "Sin cuota mensual fija",
      "Builds medidos por uso",
      "Mismo stack que Studio",
      "Corte mensual transparente",
    ],
    cta: "Activar medido",
  },
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanCard) {
    setError(null);
    if (plan.id === "free") {
      router.push(isSignedIn ? "/app" : "/sign-up");
      return;
    }
    if (!isSignedIn) {
      router.push(`/sign-up?plan=${plan.id}`);
      return;
    }
    try {
      setLoading(plan.id);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "No pude iniciar el pago. Intenta de nuevo.");
        setLoading(null);
      }
    } catch {
      setError("No pude iniciar el pago. Intenta de nuevo.");
      setLoading(null);
    }
  }

  return (
    <>
      <MarketingHeader />
      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-violet-aura" />
        <div className="mx-auto max-w-container px-5 pb-24 pt-16 md:px-margin-desktop md:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip mx-auto w-fit border-violet-500/30 bg-violet-500/5 text-violet-300">
              <Sparkles size={12} className="text-cyber-cyan" /> Precios en USD, sin sorpresas
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Un operador. Cuatro maneras de pagarle.
            </h1>
            <p className="mt-4 text-on-surface-variant md:text-lg">
              Todos los planes incluyen a V. Empieza gratis, sube cuando tu stack lo pida —
              o paga solo por lo que ejecuta.
            </p>
          </div>

          {error && (
            <p className="mx-auto mt-8 max-w-md rounded-xl border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-center text-sm text-error-crimson">
              {error}
            </p>
          )}

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => (
              <article
                key={p.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl border p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-300 hover:-translate-y-1 ${
                  p.highlight
                    ? "glow-border border-transparent bg-gradient-to-b from-violet-500/[0.09] to-cyan-400/[0.05]"
                    : p.hero
                      ? "border-cyan-400/25 bg-gradient-to-b from-cyan-400/[0.05] to-transparent"
                      : "border-app bg-tint-1"
                }`}
              >
                {p.highlight && (
                  <span className="chip absolute right-4 top-4 border-cyan-400/30 bg-cyan-400/5 text-cyan-400">
                    El más elegido
                  </span>
                )}
                {p.id === "payg" && (
                  <span className="chip absolute right-4 top-4 border-violet-500/30 bg-violet-500/5 text-violet-300">
                    <Zap size={11} /> Medido
                  </span>
                )}
                <h2 className="font-display text-2xl font-semibold">{p.name}</h2>
                <p className="mt-1 min-h-[40px] text-sm text-on-surface-variant">{p.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">
                    {p.price}
                  </span>
                  <span className="text-sm text-on-surface-variant">{p.cadence}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-on-surface">
                      <Check size={14} className="shrink-0 text-success-emerald" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choose(p)}
                  disabled={loading !== null}
                  style={{ minHeight: 44, touchAction: "manipulation" }}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 ${
                    p.highlight || p.hero ? "btn-primary" : "btn-ghost"
                  } disabled:opacity-60`}
                >
                  {loading === p.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    p.cta
                  )}
                </button>
              </article>
            ))}
          </div>

          <p className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            ¿Necesitas un tier enterprise?{" "}
            <Link href="#" className="text-cyber-cyan">
              Habla con nosotros
            </Link>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
