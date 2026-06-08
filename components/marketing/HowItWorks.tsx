"use client";

import { MessagesSquare, Sparkles, ShieldCheck, Rocket } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

const icons = [MessagesSquare, Sparkles, ShieldCheck, Rocket];

export function HowItWorks() {
  const t = useT();
  const steps = t.marketing.how_steps.map((s, i) => ({ icon: icons[i], title: s.title, text: s.body }));
  return (
    <section className="relative border-b border-app bg-ink/40">
      <div className="mx-auto max-w-container px-5 py-20 md:px-margin-desktop md:py-28">
        <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-2">
          <div>
            <span className="label-caps text-cyber-cyan">{t.marketing.how_eyebrow}</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl text-balance">
              {t.marketing.how_title}
            </h2>
          </div>
          <p className="text-on-surface-variant md:text-right">{t.marketing.how_body}</p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="glass relative overflow-hidden rounded-xl p-6">
              <div className="absolute right-4 top-4 font-mono text-[11px] tracking-[0.18em] text-muted">
                0{i + 1}
              </div>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyber-cyan ring-1 ring-cyan-400/20">
                <s.icon size={18} />
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-on-surface-variant">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
