"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { CheckCircle2, CircleDot, ExternalLink, Rocket } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
  domain?: string | null;
}

type DeployStatus = "ready" | "preview" | "draft";

function statusOf(p: Project): DeployStatus {
  if (p.category === "produccion") return "ready";
  if (p.category === "activo" || p.category === "en_revision") return "preview";
  return "draft";
}

export default function DeploymentsPage() {
  const t = useT();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects: Project[] }) =>
        setProjects((d.projects ?? []).filter((p) => p.vercel_url)),
      )
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={t.deployments.eyebrow}
        title={t.deployments.title}
        description={t.deployments.body}
        actions={
          <button className="btn-primary">
            <Rocket size={13} /> {t.deployments.open_vercel}
          </button>
        }
      />

      <div className="px-5 py-6 md:px-8">
        {error && (
          <div className="mb-4 rounded-md border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[70px] rounded-xl border border-app bg-tint-1/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="rounded-xl border border-app bg-tint-1 p-10 text-center text-on-surface-variant">
            <Rocket className="mx-auto mb-3 text-cyber-cyan" size={24} />
            <p className="font-display text-lg">Ningún proyecto desplegado todavía</p>
            <p className="mt-2 text-sm">
              Cuando V despliegue un proyecto en Vercel, aparece aquí con
              dominio y estado en vivo.
            </p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="rounded-xl border border-app">
            <div className="grid grid-cols-12 items-center gap-3 border-b border-app bg-tint-1 px-4 py-2">
              <span className="col-span-5 label-caps text-muted">proyecto</span>
              <span className="col-span-3 label-caps text-muted">dominio</span>
              <span className="col-span-2 label-caps text-muted">estado</span>
              <span className="col-span-2 label-caps text-muted text-right">
                acción
              </span>
            </div>
            <ul>
              {projects.map((p) => {
                const status = statusOf(p);
                const host =
                  p.domain ?? (p.vercel_url ?? "").replace(/^https?:\/\//, "");
                return (
                  <li
                    key={p.id}
                    className="grid grid-cols-12 items-center gap-3 border-b border-app px-4 py-3 last:border-0 hover:bg-tint-1"
                  >
                    <div className="col-span-5 min-w-0">
                      <p className="font-display font-semibold text-on-surface truncate">
                        {p.name}
                      </p>
                      <p className="font-mono text-[11px] uppercase tracking-widest text-muted truncate">
                        {p.github_repo ?? "sin repo"}
                      </p>
                    </div>
                    <div className="col-span-3 font-mono text-[12px] text-on-surface-variant truncate">
                      {host}
                    </div>
                    <div className="col-span-2">
                      {status === "ready" && (
                        <span className="chip text-success-emerald">
                          <CheckCircle2 size={11} /> live
                        </span>
                      )}
                      {status === "preview" && (
                        <span className="chip text-cyber-cyan">
                          <CircleDot size={11} className="animate-pulse" /> preview
                        </span>
                      )}
                      {status === "draft" && (
                        <span className="chip text-muted">
                          <CircleDot size={11} /> draft
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <a
                        href={p.vercel_url!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-app px-2.5 py-1.5 text-[12px] text-on-surface-variant hover:bg-tint-2 hover:text-on-surface"
                      >
                        <ExternalLink size={11} /> abrir
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
