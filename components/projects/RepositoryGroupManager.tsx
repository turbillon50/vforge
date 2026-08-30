"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconCheck,
  IconGithub,
  IconPlus,
  IconTrash,
  IconX,
} from "@/components/brand/VFIcons";
import {
  PROJECT_REPOSITORY_ROLES,
  type ProjectRepository,
  type ProjectRepositoryRole,
} from "@/lib/projects/repository-groups";

interface AvailableRepo {
  full_name: string;
  private: boolean;
  language: string | null;
  updated_at: string | null;
}

const ROLE_LABEL: Record<ProjectRepositoryRole, string> = {
  app: "App",
  frontend: "Frontend",
  backend: "Backend",
  api: "API",
  admin: "Administración",
  mobile: "Móvil",
  infra: "Infraestructura",
  docs: "Documentación",
  shared: "Compartido",
  other: "Otro",
};

export function RepositoryGroupManager({
  projectId,
  projectName,
  initialRepositories,
  onClose,
  onChanged,
}: {
  projectId: string;
  projectName: string;
  initialRepositories: ProjectRepository[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [repositories, setRepositories] = useState(initialRepositories);
  const [available, setAvailable] = useState<AvailableRepo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/github/repos?max=500", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as {
          repos?: AvailableRepo[];
          needsConnect?: string;
        };
      })
      .then((payload) => {
        if (!active) return;
        if (payload.needsConnect) {
          setError("Conecta GitHub antes de administrar repositorios.");
        }
        setAvailable(Array.isArray(payload.repos) ? payload.repos : []);
      })
      .catch(() => {
        if (active) setError("No se pudo leer el inventario de GitHub.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentNames = useMemo(
    () => new Set(repositories.map((repo) => repo.repo_full_name.toLowerCase())),
    [repositories],
  );
  const candidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return available
      .filter((repo) => !currentNames.has(repo.full_name.toLowerCase()))
      .filter((repo) => !needle || repo.full_name.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [available, currentNames, search]);

  async function upsert(
    repoFullName: string,
    role: ProjectRepositoryRole,
    isPrimary = false,
  ) {
    setSaving(repoFullName);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/repositories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo_full_name: repoFullName,
            role,
            is_primary: isPrimary,
          }),
        },
      );
      const payload = (await response.json()) as {
        repositories?: ProjectRepository[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "save_failed");
      setRepositories(payload.repositories ?? []);
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el repositorio.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function remove(repoFullName: string) {
    setSaving(repoFullName);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/repositories?repo=${encodeURIComponent(repoFullName)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as {
        repositories?: ProjectRepository[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "delete_failed");
      setRepositories(payload.repositories ?? []);
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo quitar el repositorio.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repository-group-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col border border-black bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-1)] px-5 py-5 md:px-7">
          <div>
            <p className="mono-label">Grupo de repositorios</p>
            <h2 id="repository-group-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {projectName}
            </h2>
            <p className="mt-2 max-w-xl text-[12px] leading-5 text-[var(--fg-secondary)]">
              Un proyecto puede reunir frontend, API, administración, móvil e
              infraestructura. El principal conserva compatibilidad con deploys y herramientas existentes.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !min-h-9 !px-3" aria-label="Cerrar">
            <IconX size={14} />
          </button>
        </header>

        <div className="overflow-y-auto">
          <section className="border-b border-[var(--border-1)] px-5 py-5 md:px-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-medium">Repositorios del proyecto</h3>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                {repositories.length} enlazados
              </span>
            </div>
            {repositories.length === 0 ? (
              <p className="border border-dashed border-[var(--border-1)] px-4 py-6 text-[12px] text-[var(--fg-muted)]">
                Agrega el primer repositorio; quedará como principal.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-1)] border border-[var(--border-1)]">
                {repositories.map((repo) => (
                  <div key={repo.repo_full_name} className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-mono text-[11px]">
                        <IconGithub size={12} className="shrink-0" />
                        <span className="truncate">{repo.repo_full_name}</span>
                      </p>
                      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                        {repo.is_primary ? "Principal" : "Relacionado"}
                        {repo.language ? ` · ${repo.language}` : ""}
                      </p>
                    </div>
                    <select
                      value={repo.role}
                      disabled={saving === repo.repo_full_name}
                      onChange={(event) =>
                        void upsert(
                          repo.repo_full_name,
                          event.target.value as ProjectRepositoryRole,
                        )
                      }
                      className="min-h-9 rounded border border-[var(--border-1)] bg-white px-2 font-mono text-[9px] uppercase"
                      aria-label={`Rol de ${repo.repo_full_name}`}
                    >
                      {PROJECT_REPOSITORY_ROLES.map((role) => (
                        <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 md:justify-end">
                      {!repo.is_primary ? (
                        <button
                          type="button"
                          disabled={saving === repo.repo_full_name}
                          onClick={() => void upsert(repo.repo_full_name, repo.role, true)}
                          className="btn-ghost !min-h-9 !px-3"
                        >
                          <IconCheck size={11} /> Principal
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving === repo.repo_full_name}
                        onClick={() => void remove(repo.repo_full_name)}
                        className="btn-ghost !min-h-9 !px-3"
                        aria-label={`Quitar ${repo.repo_full_name}`}
                      >
                        <IconTrash size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="px-5 py-5 md:px-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-[13px] font-medium">Agregar desde GitHub</h3>
                <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
                  Inventario real de la cuenta conectada.
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar owner/repositorio"
                className="min-h-10 w-full rounded border border-[var(--border-1)] bg-white px-3 font-mono text-[10px] md:max-w-xs"
              />
            </div>

            {error ? (
              <p className="mt-3 border border-black px-3 py-3 text-[11px]">{error}</p>
            ) : null}

            <div className="mt-4 max-h-64 divide-y divide-[var(--border-1)] overflow-y-auto border border-[var(--border-1)]">
              {loading ? (
                <p className="px-4 py-6 text-[11px] text-[var(--fg-muted)]">Leyendo GitHub…</p>
              ) : candidates.length === 0 ? (
                <p className="px-4 py-6 text-[11px] text-[var(--fg-muted)]">
                  No hay repositorios disponibles con ese filtro.
                </p>
              ) : (
                candidates.map((repo) => (
                  <div key={repo.full_name} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px]">{repo.full_name}</p>
                      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                        {repo.private ? "Privado" : "Público"}{repo.language ? ` · ${repo.language}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving === repo.full_name}
                      onClick={() => void upsert(repo.full_name, "app")}
                      className="btn-ghost !min-h-9 shrink-0 !px-3"
                    >
                      <IconPlus size={11} /> Agregar
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

