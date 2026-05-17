"use client";

import Link from "next/link";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Activity, GitBranch, Layers, Rocket, Sparkles, Users } from "lucide-react";
import { useT, interpolate } from "@/i18n/AppProviders";

type Project = {
  id: string;
  name: string;
  domain: string;
  status: "live" | "preview" | "draft";
  modules: string[];
  members: number;
  lastDeploy: string;
};

const projects: Project[] = [
  { id: "orion", name: "Orion Studio", domain: "forge.app", status: "live", modules: ["Clerk", "Stripe", "Twilio", "Maps"], members: 4, lastDeploy: "12m" },
  { id: "atlas", name: "Atlas Bookings", domain: "atlas.studio", status: "preview", modules: ["Clerk", "Stripe", "Resend"], members: 2, lastDeploy: "1h" },
  { id: "nova", name: "Nova CRM", domain: "—", status: "draft", modules: ["Clerk"], members: 1, lastDeploy: "—" },
];

export default function ProjectsPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        eyebrow={t.projects.eyebrow}
        title={t.projects.title}
        description={t.projects.body}
        actions={
          <>
            <button className="btn-ghost">{t.projects.cta_import}</button>
            <Link href="/app/chat" className="btn-primary">
              <Sparkles size={13} /> {t.projects.cta_new}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
        {projects.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-app bg-tint-1 p-6 transition hover:border-violet-500/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{p.name}</h3>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{p.domain}</p>
              </div>
              {p.status === "live" && <span className="chip text-success-emerald">● {t.common.status_live}</span>}
              {p.status === "preview" && <span className="chip text-cyber-cyan">● {t.common.status_preview}</span>}
              {p.status === "draft" && <span className="chip text-muted">● {t.common.status_draft}</span>}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-lg border border-app bg-tint-1 p-3">
                <p className="label-caps text-muted">{t.projects.stats.modules}</p>
                <p className="mt-1 text-on-surface flex items-center gap-1.5">
                  <Layers size={12} className="text-violet-300" /> {p.modules.length}
                </p>
              </div>
              <div className="rounded-lg border border-app bg-tint-1 p-3">
                <p className="label-caps text-muted">{t.projects.stats.team}</p>
                <p className="mt-1 text-on-surface flex items-center gap-1.5">
                  <Users size={12} className="text-cyber-cyan" /> {p.members}
                </p>
              </div>
              <div className="rounded-lg border border-app bg-tint-1 p-3">
                <p className="label-caps text-muted">{t.projects.stats.last_deploy}</p>
                <p className="mt-1 text-on-surface flex items-center gap-1.5">
                  <Activity size={12} /> {p.lastDeploy}
                </p>
              </div>
              <div className="rounded-lg border border-app bg-tint-1 p-3">
                <p className="label-caps text-muted">{t.projects.stats.repo}</p>
                <p className="mt-1 text-on-surface flex items-center gap-1.5">
                  <GitBranch size={12} /> 3
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {p.modules.map((m) => (
                <span key={m} className="chip">{m}</span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-app pt-4">
              <Link href="/app/chat" className="font-mono text-[11px] uppercase tracking-widest text-cyber-cyan hover:text-cyan-400">
                {interpolate(t.projects.ask_b, { name: p.name })}
              </Link>
              <button className="btn-ghost !px-3 !py-1.5">
                <Rocket size={12} /> {t.projects.open}
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
