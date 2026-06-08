"use client";

import {
  Boxes,
  KeyRound,
  PlugZap,
  Rocket,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

const icons = [Terminal, Boxes, KeyRound, PlugZap, ShieldAlert, Rocket];

export function Problem() {
  const t = useT();
  const items = t.marketing.problem_items.map((label, i) => ({ icon: icons[i], label }));
  return (
    <section className="border-y border-app bg-ink/60">
      <div className="mx-auto max-w-container px-5 py-20 md:px-margin-desktop md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <span className="label-caps text-cyber-cyan">{t.marketing.problem_eyebrow}</span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              {t.marketing.problem_title}
            </h2>
            <p className="mt-5 text-on-surface-variant">{t.marketing.problem_body}</p>
          </div>

          <div className="md:col-span-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((p) => (
                <div
                  key={p.label}
                  className="group flex items-center gap-3 rounded-lg border border-app bg-tint-1 px-4 py-4 transition hover:border-cyber-cyan/30 hover:bg-tint-2"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-tint-2 text-on-surface-variant group-hover:text-cyber-cyan">
                    <p.icon size={16} />
                  </div>
                  <p className="text-sm text-on-surface">{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
