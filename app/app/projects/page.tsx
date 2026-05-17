"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Activity, GitBranch, Layers, Rocket, Sparkles, Users } from "lucide-react";
import { useT, interpolate } from "@/i18n/AppProviders";

interface RealProject {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  domain?: string | null;
}

const STATUS_FROM_CATEGORY: Record<string, "live" | "preview" | "draft" | "archived"> = {
  produccion: "live",
  activo: "preview",
  en_revision: "preview",
  en_pausa: "draft",
  archivo: "archived",
  pendiente_borrado: "archived",
};

export default function ProjectsPage() {
  const t = useT();
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { projects: RealProject[] }) => setProjects(d.projects ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

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

      {error && (
        <div className="mx-5 mt-4 rounded-md border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson md:mx-8">
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[280px] rounded-xl border border-app bg-tint-1/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && !error && (
        <div className="mx-auto max-w-md p-10 text-center text-on-surface-variant">
          <p className="font-display text-lg">Aún no tienes proyectos en la base.</p>
          <p className="mt-2 text-sm">
            Habla con V y dile que de alta tu primer proyecto.
          </p>
          <Link href="/app/chat" className="btn-primary mt-5 inline-flex">
            <Sparkles size={13} /> Hablar con V
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
        {projects.map((p) => {
          const status = STATUS_FROM_CATEGORY[p.category] ?? "draft";
          const domain = p.domain || p.vercel_url?.replace(/^https?:\/\//, "") || "—";
          return (
            <article
              key={p.id}
              className="rounded-xl border border-app bg-tint-1 p-6 transition hover:border-violet-500/30"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold tracking-tight truncate">
                    {p.name}
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted truncate">
                    {domain}
                  </p>
                </div>
                {status === "live" && (
                  <span className="chip text-success-emerald shrink-0">
                    ● {t.common.status_live}
                  </span>
                )}
                {status === "preview" && (
                  <span className="chip text-cyber-cyan shrink-0">
                    ● {t.common.status_preview}
                  </span>
                )}
                {status === "draft" && (
                  <span className="chip text-muted shrink-0">
                    ● {t.common.status_draft}
                  </span>
                )}
                {status === "archived" && (
                  <span className="chip text-muted shrink-0">● archivo</span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg border border-app bg-tint-1 p-3">
                  <p className="label-caps text-muted">{t.projects.stats.modules}</p>
                  <p className="mt-1 text-on-surface flex items-center gap-1.5">
                    <Layers size={12} className="text-violet-300" /> —
                  </p>
                </div>
                <div className="rounded-lg border border-app bg-tint-1 p-3">
                  <p className="label-caps text-muted">{t.projects.stats.team}</p>
                  <p className="mt-1 text-on-surface flex items-center gap-1.5">
                    <Users size={12} className="text-cyber-cyan" /> 1
                  </p>
                </div>
                <div className="rounded-lg border border-app bg-tint-1 p-3">
                  <p className="label-caps text-muted">{t.projects.stats.last_deploy}</p>
                  <p className="mt-1 text-on-surface flex items-center gap-1.5">
                    <Activity size={12} /> {p.vercel_url ? "live" : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-app bg-tint-1 p-3">
                  <p className="label-caps text-muted">{t.projects.stats.repo}</p>
                  <p className="mt-1 text-on-surface flex items-center gap-1.5 truncate">
                    <GitBranch size={12} />{" "}
                    <span className="truncate font-mono text-[11px]">
                      {p.github_repo ?? "—"}
                    </span>
                  </p>
                </div>
              </div>

              {p.github_language && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  <span className="chip">{p.github_language}</span>
                  <span className="chip">{p.category}</span>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-app pt-4">
                <Link
                  href="/app/chat"
                  className="font-mono text-[11px] uppercase tracking-widest text-cyber-cyan hover:text-cyan-400"
                >
                  {interpolate(t.projects.ask_b, { name: p.name })}
                </Link>
                {p.vercel_url ? (
                  <a
                    href={p.vercel_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost !px-3 !py-1.5"
                  >
                    <Rocket size={12} /> {t.projects.open}
                  </a>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    sin deploy
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
