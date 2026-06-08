"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Icon3D } from "@/components/brand/Icon3D";
import { CheckCircle2, CircleDot, ExternalLink, Rocket, GitBranch, Globe } from "lucide-react";
import { motion } from "framer-motion";
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

const STATUS_META: Record<DeployStatus, { label: string; badge: string; dot: string }> = {
  ready: { label: "live", badge: "crystal-badge-live", dot: "#34d399" },
  preview: { label: "preview", badge: "crystal-badge", dot: "#22d3ee" },
  draft: { label: "draft", badge: "crystal-badge-warn", dot: "#9ca3af" },
};

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
          <div className="mb-4 rounded-xl border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[150px] rounded-2xl border border-app bg-tint-1/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="crystal-card p-10 text-center text-on-surface-variant">
            <div className="crystal-icon-cap mx-auto mb-4 h-14 w-14">
              <Icon3D name="rocket" size={34} glow />
            </div>
            <p className="font-display text-lg text-on-surface">Ningún proyecto desplegado todavía</p>
            <p className="mx-auto mt-2 max-w-sm text-sm">
              Cuando V despliegue un proyecto en Vercel, aparece aquí con dominio
              y estado en vivo.
            </p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, idx) => {
              const status = statusOf(p);
              const meta = STATUS_META[status];
              const host = p.domain ?? (p.vercel_url ?? "").replace(/^https?:\/\//, "");
              const repo = (p.github_repo ?? "sin repo").split("/").pop() ?? "sin repo";
              return (
                <motion.a
                  key={p.id}
                  href={p.vercel_url!}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.4), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="crystal-card card-lift group relative block overflow-hidden p-5"
                >
                  {/* halo de estado arriba a la derecha */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-2xl transition group-hover:opacity-70"
                    style={{ background: `radial-gradient(circle, ${meta.dot}, transparent 70%)` }}
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="crystal-icon-cap h-11 w-11 shrink-0">
                        <Icon3D name="rocket" size={26} glow={status === "ready"} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-[15px] font-semibold leading-tight text-on-surface truncate">
                          {p.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted truncate">
                          <GitBranch size={9} /> {repo}
                        </p>
                      </div>
                    </div>
                    <span className={`${meta.badge} shrink-0`}>
                      {status === "ready" ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <CircleDot size={10} className={status === "preview" ? "animate-pulse" : ""} />
                      )}
                      {meta.label}
                    </span>
                  </div>

                  <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-app/60 bg-black/20 px-3 py-2">
                    <Globe size={12} className="shrink-0 text-cyber-cyan" />
                    <span className="min-w-0 flex-1 font-mono text-[12px] text-on-surface-variant truncate">
                      {host}
                    </span>
                    <ExternalLink
                      size={13}
                      className="shrink-0 text-muted transition group-hover:text-violet-300"
                    />
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
