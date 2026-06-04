"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ProjectGraph } from "@/components/graph/ProjectGraph";
import { GitBranch, Lock, Star, LayoutGrid, Workflow } from "lucide-react";
import { useT } from "@/i18n/AppProviders";


interface Repo {
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  pushed_at: string;
  html_url: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h`;
  return "ahora";
}

type View = "grid" | "graph";

export default function RepoVisionPage() {
  const t = useT();
  const [view, setView] = useState<View>("grid");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (view !== "grid") return;
    setLoading(true);
    setError(null);
    fetch("/api/github/repos", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudieron cargar los repos (HTTP ${r.status})`);
        return r.json();
      })
      .then((d: { repos: Repo[] }) => setRepos(d.repos ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [view]);

  return (
    <>
      <PageHeader
        eyebrow={t.repovision.eyebrow}
        title={t.repovision.title}
        description={t.repovision.body}
        actions={
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{
              background: "rgba(30,111,255,0.06)",
              border: "1px solid rgba(30,111,255,0.15)",
            }}
          >
            <ViewBtn
              active={view === "grid"}
              onClick={() => setView("grid")}
              icon={<LayoutGrid size={13} />}
              label="Lista"
            />
            <ViewBtn
              active={view === "graph"}
              onClick={() => setView("graph")}
              icon={<Workflow size={13} />}
              label="Graph 3D"
            />
          </div>
        }
      />

      {/* Graph 3D — flex-1 so it fills remaining space in the scroll column */}
      {view === "graph" && (
        <div className="flex-1 min-h-0 mx-0" style={{ minHeight: 400 }}>
          <ProjectGraph />
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div className="px-5 py-6 md:px-8">
          {error && (
            <div className="mb-4 rounded-md border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
              ⚠ {error}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[120px] rounded-xl border border-app animate-pulse"
                  style={{ background: "rgba(var(--tint-1), 0.4)" }}
                />
              ))}
            </div>
          )}

          {!loading && repos.length === 0 && !error && (
            <div className="rounded-xl border border-app bg-tint-1 p-10 text-center text-on-surface-variant">
              <GitBranch className="mx-auto mb-3 text-violet-300" size={24} />
              <p className="font-display text-lg">No hay repos cargados</p>
              <p className="mt-2 text-sm">
                Conéctate y vuelve a intentar, o revisa tu GitHub en Integraciones.
              </p>
            </div>
          )}

          {!loading && repos.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {repos.map((r) => (
                <a
                  key={r.full_name}
                  href={r.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-app bg-tint-1 p-4 transition hover:border-violet-500/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <GitBranch size={14} className="text-violet-300 shrink-0" />
                        <p className="font-display font-semibold text-on-surface truncate">
                          {r.name}
                        </p>
                        {r.private && (
                          <Lock size={11} className="text-muted shrink-0" />
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted truncate">
                        {r.full_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-muted shrink-0">
                      <Star size={11} /> {r.stargazers_count}
                    </div>
                  </div>
                  {r.description && (
                    <p className="mt-3 text-sm text-on-surface-variant line-clamp-2">
                      {r.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {r.language && (
                      <span className="text-cyber-cyan">{r.language}</span>
                    )}
                    <span>· {r.default_branch}</span>
                    <span>· push {timeAgo(r.pushed_at)}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ViewBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
      style={{
        background: active ? "rgba(30,111,255,0.2)" : "transparent",
        color: active ? "#4499ff" : "#556677",
        border: active ? "1px solid rgba(30,111,255,0.35)" : "1px solid transparent",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
