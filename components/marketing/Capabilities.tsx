"use client";

import {
  Code2,
  Database,
  Globe2,
  KeyRound,
  Layers,
  PlugZap,
  Rocket,
  Terminal,
  Workflow,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

const icons = [Code2, Terminal, Rocket, PlugZap, KeyRound, Globe2, Database, Workflow, Layers];

export function Capabilities() {
  const t = useT();
  const items = t.marketing.capabilities_items.map((it, i) => ({
    icon: icons[i],
    title: it.title,
    text: it.body,
  }));
  return (
    <section id="product" className="border-b border-app">
      <div className="mx-auto max-w-container px-5 py-20 md:px-margin-desktop md:py-28">
        <div className="flex flex-col items-center text-center">
          <span className="label-caps text-cyber-cyan">{t.marketing.capabilities_eyebrow}</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl text-balance">
            {t.marketing.capabilities_title}
          </h2>
          <p className="mt-4 max-w-2xl text-on-surface-variant">
            {t.marketing.capabilities_subtitle}
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <article
              key={it.title}
              className="group relative overflow-hidden rounded-xl border border-app bg-tint-1 p-6 transition hover:border-violet-500/30 hover:bg-tint-2"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-cyan opacity-0 blur-3xl transition group-hover:opacity-20" />
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
                <it.icon size={18} />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{it.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
