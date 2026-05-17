"use client";

import { PageHeader } from "@/components/workspace/PageHeader";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Globe2,
  KeyRound,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export default function ActivityPage() {
  const t = useT();
  const items = [
    { icon: Rocket, time: "12m", tone: "emerald", title: t.activity.eyebrow + " · 1", body: "orion-web → production · build 42s · 0 errors" },
    { icon: Sparkles, time: "23m", tone: "violet", title: t.common.label_b, body: "Stripe checkout · /pricing" },
    { icon: ShieldCheck, time: "1h", tone: "cyan", title: t.secrets.eyebrow, body: t.secrets.sealed },
    { icon: GitBranch, time: "2h", tone: "violet", title: "PR", body: "feat/bookings on orion-api" },
    { icon: Globe2, time: "3h", tone: "emerald", title: "forge.app", body: "SSL renewed · DNSSEC active" },
    { icon: AlertTriangle, time: "5h", tone: "crimson", title: "webhook", body: "stripe.checkout.session.completed retry 2/3" },
    { icon: KeyRound, time: "1d", tone: "violet", title: "DATABASE_URL", body: "rotated · orion-api" },
    { icon: CheckCircle2, time: "1d", tone: "emerald", title: "backup", body: "Postgres dump · 142 MB · OK" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.activity.eyebrow}
        title={t.activity.title}
        description={t.activity.body}
        actions={<button className="btn-ghost">{t.activity.export}</button>}
      />

      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <ol className="relative space-y-4 border-l border-app pl-6">
          {items.map((it, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[26px] top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-void ${
                  it.tone === "violet"
                    ? "bg-violet-400"
                    : it.tone === "cyan"
                    ? "bg-cyber-cyan"
                    : it.tone === "emerald"
                    ? "bg-success-emerald"
                    : "bg-error-crimson"
                }`}
              />
              <div className="rounded-xl border border-app bg-tint-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <it.icon size={15} className="text-on-surface-variant" />
                    <p className="font-display font-semibold text-on-surface">{it.title}</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{it.time}</span>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">{it.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
