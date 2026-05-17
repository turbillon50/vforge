"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CreditCard,
  Database,
  Eye,
  Globe2,
  HardDrive,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

type ModuleKey = "clerk" | "stripe" | "twilio" | "maps" | "neon" | "vision" | "mail" | "storage" | "vercel" | "domains" | "agent" | "audit";

const moduleOrder: { id: ModuleKey; icon: LucideIcon; installed?: boolean; recommended?: boolean }[] = [
  { id: "clerk", icon: KeyRound, installed: true, recommended: true },
  { id: "stripe", icon: CreditCard, installed: true, recommended: true },
  { id: "twilio", icon: Phone },
  { id: "maps", icon: MapPin },
  { id: "neon", icon: Database, installed: true },
  { id: "vision", icon: Eye, recommended: true },
  { id: "mail", icon: Mail },
  { id: "storage", icon: HardDrive },
  { id: "vercel", icon: Rocket, installed: true },
  { id: "domains", icon: Globe2 },
  { id: "agent", icon: Bot },
  { id: "audit", icon: ShieldCheck },
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
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
                <span className="chip text-cyber-cyan"><Sparkles size={10} /> {t.common.label_b_picks}</span>
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
        <div className="mx-5 mb-10 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 md:mx-8">
          <p className="label-caps mb-2 text-cyber-cyan">{t.marketplace.ask_b_title}</p>
          <p className="text-on-surface">{t.marketplace.ask_b_body}</p>
        </div>
      )}
    </div>
  );
}
