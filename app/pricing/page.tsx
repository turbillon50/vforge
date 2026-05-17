"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useT } from "@/i18n/AppProviders";

const planMeta = [
  { highlight: false, href: "/sign-up" },
  { highlight: true, href: "/sign-up?plan=studio" },
  { highlight: false, href: "/sign-up?plan=forge" },
];

export default function PricingPage() {
  const t = useT();
  return (
    <>
      <MarketingHeader />
      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-violet-aura" />
        <div className="mx-auto max-w-container px-5 pb-20 pt-16 md:px-margin-desktop md:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip mx-auto border-violet-500/30 bg-violet-500/5 text-violet-300 w-fit">
              <Sparkles size={12} className="text-cyber-cyan" /> {t.pricing.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              {t.pricing.title}
            </h1>
            <p className="mt-3 text-on-surface-variant">{t.pricing.body}</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {t.pricing.plans.map((p, i) => {
              const m = planMeta[i];
              return (
                <article
                  key={p.name}
                  className={`relative overflow-hidden rounded-2xl border p-7 ${
                    m.highlight
                      ? "glow-border border-transparent bg-gradient-to-b from-violet-500/[0.07] to-cyan-400/[0.04]"
                      : "border-app bg-tint-1"
                  }`}
                >
                  {m.highlight && (
                    <span className="chip absolute right-4 top-4 border-cyan-400/30 bg-cyan-400/5 text-cyan-400">
                      {t.pricing.most_chosen}
                    </span>
                  )}
                  <h2 className="font-display text-2xl font-semibold">{p.name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{p.blurb}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-semibold tracking-tight">{p.price}</span>
                    <span className="text-sm text-on-surface-variant">{p.cadence}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-on-surface">
                        <Check size={14} className="text-success-emerald" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={m.href}
                    className={`mt-8 inline-flex w-full justify-center ${m.highlight ? "btn-primary" : "btn-ghost"}`}
                  >
                    {p.cta}
                  </Link>
                </article>
              );
            })}
          </div>

          <p className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {t.pricing.talk_to_us_pre}
            <Link href="#" className="text-cyber-cyan">{t.pricing.talk_to_us_link}</Link>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
