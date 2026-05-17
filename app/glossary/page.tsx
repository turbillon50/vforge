"use client";

import Link from "next/link";
import {
  Boxes,
  Cloud,
  CreditCard,
  Database,
  Globe2,
  KeyRound,
  Layers,
  PlugZap,
  Rocket,
  Server,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useT } from "@/i18n/AppProviders";

const icons: LucideIcon[] = [Boxes, Rocket, Globe2, KeyRound, PlugZap, Database, Workflow, Layers, Cloud, Server, ShieldCheck, CreditCard];
const tones = ["violet", "cyan", "violet", "cyan", "violet", "cyan", "violet", "cyan", "violet", "cyan", "violet", "cyan"] as const;

export default function GlossaryPage() {
  const t = useT();
  const terms = t.glossary.terms.map((term, i) => ({
    icon: icons[i],
    title: term.title,
    body: term.body,
    examples: term.examples,
    tone: tones[i],
  }));

  return (
    <>
      <MarketingHeader />
      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-violet-aura" />
        <div className="mx-auto max-w-container px-5 pb-20 pt-16 md:px-margin-desktop md:pt-24">
          <div className="max-w-2xl">
            <span className="label-caps text-cyber-cyan">{t.glossary.eyebrow}</span>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              {t.glossary.title}
            </h1>
            <p className="mt-4 text-on-surface-variant">{t.glossary.body}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {terms.map((it) => (
              <article
                key={it.title}
                className="relative overflow-hidden rounded-xl border border-app bg-tint-1 p-5 transition hover:border-app-strong"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${
                    it.tone === "violet"
                      ? "bg-violet-500/10 text-violet-300 ring-violet-500/20"
                      : "bg-cyan-400/10 text-cyber-cyan ring-cyan-400/20"
                  }`}
                >
                  <it.icon size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight">{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{it.body}</p>
                {it.examples?.length ? (
                  <div className="mt-4 rounded-md border border-app bg-tint-2 p-3 font-mono text-[11px] text-on-surface-variant">
                    {it.examples.map((e) => (
                      <div key={e}>· {e}</div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 text-center md:flex-row md:justify-center">
            <Link href="/sign-up" className="btn-primary">
              {t.glossary.cta_primary}
            </Link>
            <Link href="/app/chat" className="btn-ghost">
              {t.glossary.cta_secondary}
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
