"use client";
import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconBell, IconBot, IconCreditCard, IconDatabase, IconEye, IconGlobe, IconKey, IconMap, IconRocket, IconSearch, IconShield, IconSparkles } from "@/components/brand/VFIcons";
import { useT } from "@/i18n/AppProviders";

type ModuleKey = "clerk" | "stripe" | "twilio" | "maps" | "neon" | "vision" | "mail" | "storage" | "vercel" | "domains" | "agent" | "audit";

const moduleOrder: { id: ModuleKey; icon: (props: {size?: number; className?: string; [key: string]: unknown}) => React.ReactElement | null; installed?: boolean; recommended?: boolean }[] = [
  { id: "clerk", icon: IconKey, installed: true, recommended: true },
  { id: "stripe", icon: IconCreditCard, installed: true, recommended: true },
  { id: "twilio", icon: IconBell },
  { id: "maps", icon: IconMap },
  { id: "neon", icon: IconDatabase, installed: true },
  { id: "vision", icon: IconEye, recommended: true },
  { id: "mail", icon: IconBell },
  { id: "storage", icon: IconDatabase },
  { id: "vercel", icon: IconRocket, installed: true },
  { id: "domains", icon: IconGlobe },
  { id: "agent", icon: IconBot },
  { id: "audit", icon: IconShield },
];


const UPCOMING = [
  { name: "Stripe", blurb: "Cobros y suscripciones listos para producción." },
  { name: "Mercado Pago", blurb: "Pagos locales para Latinoamérica." },
  { name: "WhatsApp", blurb: "Conversaciones y notificaciones con tus clientes." },
  { name: "Resend", blurb: "Email transaccional con plantillas de la casa." },
  { name: "Twilio", blurb: "SMS y verificación telefónica." },
  { name: "Neon", blurb: "Postgres serverless con ramas por entorno." },
];

export function MarketplaceGrid({ context }: { context?: "workspace" | "marketing" }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(t.marketplace.categories[0]);

  const items = moduleOrder.map((m) => ({
    ...m,
    name: t.marketplace.modules[m.id].name,
    category: t.marketplace.modules[m.id].category,
    blurb: t.marketplace.modules[m.id].blurb,
  }));

  const all = t.marketplace.categories[0];
  const list = items.filter(
    (m) =>
      (cat === all || m.category === cat) &&
      (q === "" || m.name.toLowerCase().includes(q.toLowerCase()) || m.blurb.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col gap-3 px-5 py-5 md:flex-row md:items-center md:px-8">
        <div className="relative flex-1">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.marketplace.search_placeholder}
            className="input-base pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {t.marketplace.categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
                cat === c
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-300"
                  : "border-app text-on-surface-variant hover:border-app-strong"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <div className="px-5 pb-10 md:px-8">
          <div className="rounded-xl border border-app bg-tint-1 p-8 text-center">
            <p className="font-display text-lg font-semibold text-on-surface">El marketplace abre pronto</p>
            <p className="mt-2 text-sm text-on-surface-variant">Estos módulos están en camino. Te avisamos cuando puedas instalarlos.</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {UPCOMING.map((u) => (
              <article key={u.name} className="rounded-xl border border-app bg-tint-1 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-on-surface">{u.name}</h3>
                  <span className="chip text-violet-400">Próximamente</span>
                </div>
                <p className="mt-3 text-sm text-on-surface-variant">{u.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 px-5 pb-10 md:grid-cols-2 md:px-8 lg:grid-cols-3">
        {list.map((m) => (
          <motion.article
            key={m.id}
            layout
            className="group relative overflow-hidden rounded-xl border border-app bg-tint-1 p-5 transition hover:border-violet-500/30 hover:bg-tint-2"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-cyan opacity-0 blur-3xl transition group-hover:opacity-15" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
                  <m.icon size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">{m.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{m.category}</p>
                </div>
              </div>
              {m.recommended && (
                <span className="chip text-violet-400"><IconSparkles size={10} /> {t.common.label_b_picks}</span>
              )}
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">{m.blurb}</p>
            <div className="mt-5 flex items-center justify-between">
              {m.installed ? (
                <span className="chip text-success-emerald">● {t.common.status_installed}</span>
              ) : (
                <span className="chip">● {t.common.status_available}</span>
              )}
              <button className={m.installed ? "btn-ghost !px-3 !py-1.5 text-[10px]" : "btn-primary !px-3 !py-1.5 text-[10px]"}>
                {m.installed ? t.common.cta_configure : t.common.cta_install}
              </button>
            </div>
          </motion.article>
        ))}
      </div>
      {context === "workspace" && (
        <div className="mx-5 mb-10 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-5 md:mx-8">
          <p className="label-caps mb-2 text-violet-400">{t.marketplace.ask_b_title}</p>
          <p className="text-on-surface">{t.marketplace.ask_b_body}</p>
        </div>
      )}
    </div>
  );
}
