"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  Rocket,
  Clock,
  GitBranch,
  Lock,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
  github_url: string | null;
  github_private: boolean;
  github_language: string | null;
  github_default_branch: string;
  vercel_project_id: string | null;
  vercel_url: string | null;
  domain: string | null;
  category: string;
  status: string;
  last_audit_at: string | null;
  last_audit_score: number | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  produccion: "🟢 Producción",
  activo: "🔵 Activo",
  en_revision: "🟡 En revisión",
  en_pausa: "⏸️ En pausa",
  archivo: "📦 Archivo",
  pendiente_borrado: "🗑️ Pendiente borrado",
};

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  building: "Building",
  error: "Error",
  idle: "Idle",
  unknown: "Sin verificar",
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "404" | "error">(
    "loading",
  );

  useEffect(() => {
    void fetch(`/api/projects/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.status === 404) {
          setStatus("404");
          return;
        }
        if (!r.ok) {
          setStatus("error");
          return;
        }
        const data = (await r.json()) as { project: ProjectDetail };
        setProject(data.project);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="text-vf-fg-2 text-sm py-12 text-center font-mono">
        Cargando proyecto…
      </div>
    );
  }

  if (status === "404") {
    notFound();
  }

  if (status === "error" || !project) {
    return (
      <div className="text-vf-error text-sm py-12 text-center font-mono">
        Error cargando el proyecto.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <span className="font-mono text-base text-vf-fg-2 px-3 py-2 rounded-md bg-vf-bg-2 border border-vf-border-1 flex-shrink-0">
            {project.id.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-vf-fg">
                {project.name}
              </h1>
              {project.github_private && (
                <Lock className="w-4 h-4 text-vf-fg-2" />
              )}
              <span className="font-mono text-[11px] uppercase text-vf-fg-2 ml-1">
                {CATEGORY_LABEL[project.category] ?? project.category}
              </span>
            </div>
            {project.github_repo && (
              <p className="font-mono text-sm text-vf-fg-2 mt-1 truncate flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                {project.github_repo}
                {project.github_language && (
                  <span className="ml-1 px-1.5 py-0 text-[10px] bg-vf-bg-2 rounded">
                    {project.github_language}
                  </span>
                )}
              </p>
            )}
            {project.description && (
              <p className="text-vf-fg-1 text-sm mt-2 max-w-prose">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {project.domain ? (
            <Button
              variant="ghost"
              className="text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
              asChild
            >
              <a
                href={`https://${project.domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {project.domain}
              </a>
            </Button>
          ) : project.vercel_url ? (
            <Button
              variant="ghost"
              className="text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
              asChild
            >
              <a
                href={project.vercel_url.startsWith("http") ? project.vercel_url : `https://${project.vercel_url}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Deploy
              </a>
            </Button>
          ) : null}
          {project.github_url && (
            <Button
              variant="ghost"
              className="text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
              asChild
            >
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Repo
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Stat strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Estado" value={STATUS_LABEL[project.status] ?? project.status} />
        <StatBox
          label="Último audit"
          value={
            project.last_audit_at
              ? new Date(project.last_audit_at).toLocaleDateString("es-MX")
              : "Sin auditar"
          }
        />
        <StatBox
          label="Score"
          value={project.last_audit_score !== null ? `${project.last_audit_score}/100` : "—"}
        />
        <StatBox
          label="Branch"
          value={project.github_default_branch ?? "main"}
        />
      </section>

      {/* TODO: secrets section pulls from operator_secrets+user_secrets when M0 Vault wires up */}
      <section className="border border-dashed border-vf-border-1 rounded-xl p-6 text-vf-fg-2 text-sm">
        <p className="font-medium text-vf-fg mb-1">Secretos del proyecto</p>
        <p>
          Cuando se cablee el Vault (Phase B de M0), aquí aparecen las API
          keys de este proyecto con botón Ver/Copiar. Por ahora, las claves
          viven en Vercel env vars del proyecto.
        </p>
      </section>

      {/* TODO: activity section pulls from audit_events filtered by resource_id when implemented */}
      <section className="border border-dashed border-vf-border-1 rounded-xl p-6 text-vf-fg-2 text-sm">
        <p className="font-medium text-vf-fg mb-1">Actividad</p>
        <p>
          La actividad por proyecto se filtrará desde audit_events cuando V
          empiece a registrar acciones específicas (deploys, ediciones, etc.).
        </p>
      </section>

      {/* Quick links */}
      <section className="flex justify-between items-center pt-4 border-t border-vf-border">
        <Link
          href="/projects"
          className="text-sm text-vf-fg-2 hover:text-vf-fg"
        >
          ← Volver al listado
        </Link>
        <DeleteButton id={project.id} name={project.name} />
      </section>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-vf-bg-1 border border-vf-border rounded-lg p-4">
      <div className="text-vf-fg font-medium truncate">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-vf-fg-2 font-mono">
        {label}
      </div>
    </div>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.href = "/projects";
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs text-vf-fg-3 hover:text-vf-error transition-colors"
        title="Eliminar este proyecto del catálogo (Anillo 2)"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Quitar del tablero
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-vf-fg-2">¿Quitar &quot;{name}&quot;?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="px-2 py-1 rounded text-vf-fg-2 hover:text-vf-fg"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={doDelete}
        disabled={busy}
        className="px-2 py-1 rounded bg-vf-error text-white disabled:opacity-50"
      >
        {busy ? "…" : "Sí, quitar"}
      </button>
    </div>
  );
}
