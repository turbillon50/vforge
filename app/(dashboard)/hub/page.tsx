"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  GitBranch,
  Lock,
  Sparkles,
  RefreshCw,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openV } from "@/components/V/VDock";

interface Project {
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

const STATUS_TONE: Record<string, { dot: string; label: string }> = {
  produccion: { dot: "bg-vf-green", label: "Producción" },
  activo: { dot: "bg-blue-400", label: "Activo" },
  en_revision: { dot: "bg-amber-400", label: "En revisión" },
  en_pausa: { dot: "bg-vf-fg-2", label: "En pausa" },
  archivo: { dot: "bg-vf-fg-3", label: "Archivo" },
  pendiente_borrado: { dot: "bg-red-400", label: "Pendiente borrado" },
};

export default function HubPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { projects: Project[] };
      setProjects(data.projects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando proyectos");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Open V with prompt + context pre-loaded about this project.
  function askVAboutProject(p: Project) {
    openV();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("vforge:v-context", {
          detail: {
            label: "PROYECTO",
            value: `${p.name} · ${p.github_repo ?? "sin repo"}`,
            prompt: `Cuéntame el estado actual de ${p.name} (repo ${p.github_repo ?? "n/a"}, deploy ${p.vercel_url ?? "n/a"}). ¿Algo que necesite atención?`,
          },
        }),
      );
    }
  }

  const liveProjects = projects.filter(
    (p) => p.category === "produccion" || p.category === "activo",
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-vf-fg-2 mb-1">
            Hub
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-vf-fg tracking-tight">
            {loading
              ? "Cargando…"
              : projects.length === 0
                ? "Sin proyectos todavía"
                : `${projects.length} proyecto${projects.length === 1 ? "" : "s"}`}
          </h1>
          {!loading && liveProjects.length > 0 && (
            <p className="text-sm text-vf-fg-1 mt-1">
              {liveProjects.length} en producción · gestionados por V
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-vf-border bg-vf-bg-1 text-vf-fg-1 text-xs font-medium hover:text-vf-fg hover:bg-vf-bg-2 transition-colors disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refrescar
          </button>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-vf-green text-black text-xs font-semibold hover:bg-vf-green/90 transition-colors"
            style={{ touchAction: "manipulation" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Dar de alta
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          ⚠ {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && <EmptyState />}

      {/* Project list — Vercel/GitHub style rows */}
      {!loading && projects.length > 0 && (
        <section className="space-y-3">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onAskV={() => askVAboutProject(p)}
            />
          ))}
        </section>
      )}

      {/* Loading skeleton */}
      {loading && (
        <section className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[88px] rounded-lg border border-vf-border bg-vf-bg-1/40 animate-pulse"
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  onAskV,
}: {
  project: Project;
  onAskV: () => void;
}) {
  const tone = STATUS_TONE[project.category] ?? {
    dot: "bg-vf-fg-2",
    label: project.category,
  };

  return (
    <article className="group rounded-lg border border-vf-border bg-vf-bg-1/40 hover:bg-vf-bg-1 hover:border-vf-border-1 transition-colors">
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Status dot */}
        <div className="flex-shrink-0">
          <span
            className={cn("inline-block w-2 h-2 rounded-full", tone.dot)}
            title={tone.label}
            aria-label={tone.label}
          />
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <Link href={`/projects/${project.id}`} className="block group/link">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-vf-fg font-medium text-sm truncate group-hover/link:underline">
                {project.name}
              </h3>
              {project.github_private && (
                <Lock className="w-3 h-3 text-vf-fg-2 flex-shrink-0" />
              )}
              <span className="font-mono text-[10px] uppercase tracking-wider text-vf-fg-2 px-1.5 py-0.5 rounded bg-vf-bg-2 flex-shrink-0">
                {tone.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-vf-fg-2 min-w-0">
              <GitBranch className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {project.github_repo ?? "sin repo"}
              </span>
              {project.github_language && (
                <span className="ml-1 text-vf-fg-3 flex-shrink-0">
                  · {project.github_language}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {project.vercel_url && (
            <a
              href={project.vercel_url}
              target="_blank"
              rel="noreferrer"
              title="Ver deploy"
              aria-label="Ver deploy"
              className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2 transition-colors"
              style={{ touchAction: "manipulation" }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {project.github_repo && (
            <a
              href={`https://github.com/${project.github_repo}`}
              target="_blank"
              rel="noreferrer"
              title="Ver repo"
              aria-label="Ver repo"
              className="hidden sm:inline-flex w-8 h-8 items-center justify-center rounded text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2 transition-colors"
              style={{ touchAction: "manipulation" }}
            >
              <GitBranch className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onAskV}
            title="Preguntar a V sobre este proyecto"
            aria-label="Preguntar a V"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded text-vf-green hover:bg-vf-green/10 transition-colors"
            style={{ touchAction: "manipulation" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-medium">V</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-vf-border-1 bg-vf-bg-1/30 px-6 py-16 text-center space-y-5">
      <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-vf-bg-2 border border-vf-border">
        <CircleDot className="w-5 h-5 text-vf-fg-2" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-vf-fg font-semibold text-lg">
          Aún no hay proyectos
        </h2>
        <p className="text-vf-fg-1 text-sm max-w-md mx-auto">
          Da de alta tus proyectos uno por uno. V los irá conociendo conforme
          los agregues y los podrá administrar contigo.
        </p>
      </div>
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-vf-green text-black text-sm font-semibold hover:bg-vf-green/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Dar de alta el primero
      </Link>
    </div>
  );
}
