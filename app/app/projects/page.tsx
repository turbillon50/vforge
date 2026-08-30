"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconExtLink,
  IconGithub,
  IconLayout,
  IconRefresh,
  IconSearch,
  IconUsers,
} from "@/components/brand/VFIcons";
import { InviteShare } from "@/components/live/InviteShare";
import { RepositoryGroupManager } from "@/components/projects/RepositoryGroupManager";
import type { ProjectRepository } from "@/lib/projects/repository-groups";

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
  delivery_priority?: boolean;
  progress_pct?: number;
  family_code?: string | null;
  repositories: ProjectRepository[];
  repository_count: number;
}

type CategoryFilter = "all" | "produccion" | "revision" | "pausa";
type DomainFilter = "all" | "with_domain" | "no_domain";
type PriorityFilter = "all" | "priority";
type FamilyFilter = "all" | "grouped";

const CATEGORY_LABELS: Record<string, string> = {
  produccion: "Producción",
  activo: "Activo",
  en_revision: "En revisión",
  en_pausa: "En pausa",
  archivo: "Archivado",
  pendiente_borrado: "Pendiente de borrar",
};

function categoryMatches(category: string, filter: CategoryFilter) {
  if (filter === "all") return true;
  if (filter === "produccion") return category === "produccion";
  if (filter === "revision") {
    return category === "activo" || category === "en_revision";
  }
  return category === "en_pausa";
}

function hasDomain(p: Project) {
  return Boolean(p.domain?.trim());
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Raíz para detectar posibles duplicados (vliving-demo → vliving). */
function nameRoot(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(
      /-(demo|v\d+|app|site|admin|preview|front|backend|api|new|old|copy|test)$/g,
      "",
    )
    .replace(/^-+|-+$/g, "");
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [familyFilter, setFamilyFilter] = useState<FamilyFilter>("all");
  const [inviteProject, setInviteProject] = useState<Project | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [repositoryProject, setRepositoryProject] = useState<Project | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadProjects = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Tu sesión no está autorizada para ver el catálogo."
            : `No se pudo cargar el catálogo (HTTP ${response.status}).`,
        );
      }
      const payload = (await response.json()) as { projects?: Project[] };
      setProjects(Array.isArray(payload.projects) ? payload.projects : []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo cargar el catálogo.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const syncProjects = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setSyncMessage("Sincronizando GitHub y Vercel…");
    try {
      const response = await fetch("/api/projects/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as {
        github_count?: number;
        vercel_count?: number;
        inserted?: number;
        errors?: Array<unknown>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      setSyncMessage(
        `${payload.github_count ?? 0} repos · ${payload.vercel_count ?? 0} proyectos Vercel · ${payload.inserted ?? 0} nuevos`,
      );
      await loadProjects();
    } catch (caught) {
      setSyncMessage(null);
      setError(
        caught instanceof Error
          ? `No se pudo sincronizar: ${caught.message}`
          : "No se pudo sincronizar GitHub y Vercel.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const familyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      const code = p.family_code?.trim().toLowerCase();
      if (code) map.set(code, (map.get(code) ?? 0) + 1);
      const root = nameRoot(p.name || p.id);
      if (root) map.set(`~${root}`, (map.get(`~${root}`) ?? 0) + 1);
    }
    return map;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (!categoryMatches(project.category, categoryFilter)) return false;
      if (domainFilter === "with_domain" && !hasDomain(project)) return false;
      if (domainFilter === "no_domain" && hasDomain(project)) return false;
      if (priorityFilter === "priority" && !project.delivery_priority) return false;

      if (familyFilter === "grouped") {
        const code = project.family_code?.trim().toLowerCase();
        const root = nameRoot(project.name || project.id);
        const byCode = code ? (familyCounts.get(code) ?? 0) > 1 : false;
        const byRoot = root ? (familyCounts.get(`~${root}`) ?? 0) > 1 : false;
        if (!byCode && !byRoot) return false;
      }

      const matchesSearch =
        !needle ||
        project.name.toLowerCase().includes(needle) ||
        project.id.toLowerCase().includes(needle) ||
        (project.domain ?? "").toLowerCase().includes(needle) ||
        (project.github_repo ?? "").toLowerCase().includes(needle) ||
        (project.repositories ?? []).some((repo) =>
          repo.repo_full_name.toLowerCase().includes(needle),
        ) ||
        (project.family_code ?? "").toLowerCase().includes(needle);
      return matchesSearch;
    });
  }, [
    categoryFilter,
    domainFilter,
    familyCounts,
    familyFilter,
    priorityFilter,
    projects,
    search,
  ]);

  async function patchMeta(
    projectId: string,
    patch: {
      delivery_priority?: boolean;
      progress_pct?: number;
      family_code?: string | null;
    },
  ) {
    setSavingId(projectId);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/meta`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) throw new Error("save_failed");
      const data = (await res.json()) as {
        project: {
          id: string;
          delivery_priority: boolean;
          progress_pct: number;
          family_code: string | null;
        };
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                delivery_priority: data.project.delivery_priority,
                progress_pct: data.project.progress_pct,
                family_code: data.project.family_code,
              }
            : p,
        ),
      );
    } catch {
      setError("No se pudo guardar el cambio. Reintenta.");
    } finally {
      setSavingId(null);
    }
  }

  const productionCount = projects.filter((p) => p.category === "produccion").length;
  const reviewCount = projects.filter(
    (p) => p.category === "activo" || p.category === "en_revision",
  ).length;
  const priorityCount = projects.filter((p) => p.delivery_priority).length;
  const withDomainCount = projects.filter((p) => hasDomain(p)).length;
  const noDomainCount = projects.length - withDomainCount;

  const categoryFilters: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: `Todos · ${projects.length}` },
    { id: "produccion", label: `Producción · ${productionCount}` },
    { id: "revision", label: `En revisión · ${reviewCount}` },
    { id: "pausa", label: "En pausa" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <header className="border-b border-[var(--border-1)] bg-white px-5 py-7 md:px-8 md:py-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mono-label">Control room</p>
            <h1 className="mt-3 text-[clamp(2.2rem,5vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Tus proyectos.
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-6">
              Prioriza entregas, marca avance, filtra por dominio y agrupa
              posibles duplicados o familias (código).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void syncProjects()}
            disabled={refreshing}
            className="btn-ghost self-start md:self-auto"
          >
            <IconRefresh size={13} className={refreshing ? "animate-spin" : ""} />
            Sincronizar
          </button>
        </div>
      </header>

      {syncMessage ? (
        <div className="border-b border-[var(--border-1)] bg-white px-5 py-3 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--fg-secondary)] md:px-8">
          {syncMessage}
        </div>
      ) : null}

      {repositoryProject ? (
        <RepositoryGroupManager
          projectId={repositoryProject.id}
          projectName={repositoryProject.name}
          initialRepositories={repositoryProject.repositories ?? []}
          onClose={() => setRepositoryProject(null)}
          onChanged={() => void loadProjects()}
        />
      ) : null}

      {inviteProject ? (
        <div className="border-b border-[var(--border-1)] bg-[#f7f7f5] px-5 py-6 md:px-8">
          <div className="mx-auto max-w-lg">
            <InviteShare
              projectId={inviteProject.id}
              projectName={inviteProject.name}
              onClose={() => setInviteProject(null)}
            />
          </div>
        </div>
      ) : null}

      <section className="border-b border-[var(--border-1)] bg-[#f7f7f5] px-5 py-4 md:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
            {categoryFilters.map((item) => (
              <FilterChip
                key={item.id}
                active={categoryFilter === item.id}
                label={item.label}
                onClick={() => setCategoryFilter(item.id)}
              />
            ))}
          </div>

          <div className="flex max-w-full flex-wrap gap-1">
            <FilterChip
              active={priorityFilter === "priority"}
              label={`Prioridad entrega · ${priorityCount}`}
              onClick={() =>
                setPriorityFilter((v) => (v === "priority" ? "all" : "priority"))
              }
            />
            <FilterChip
              active={domainFilter === "with_domain"}
              label={`Con dominio · ${withDomainCount}`}
              onClick={() =>
                setDomainFilter((v) => (v === "with_domain" ? "all" : "with_domain"))
              }
            />
            <FilterChip
              active={domainFilter === "no_domain"}
              label={`Sin dominio · ${noDomainCount}`}
              onClick={() =>
                setDomainFilter((v) => (v === "no_domain" ? "all" : "no_domain"))
              }
            />
            <FilterChip
              active={familyFilter === "grouped"}
              label="Posibles duplicados / familia"
              onClick={() =>
                setFamilyFilter((v) => (v === "grouped" ? "all" : "grouped"))
              }
            />
          </div>

          <label className="flex min-h-10 w-full items-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-3 lg:max-w-[360px]">
            <IconSearch size={13} className="shrink-0 text-[var(--fg-muted)]" />
            <span className="sr-only">Buscar proyectos</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre, dominio, repo o familia"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-black placeholder:text-[var(--fg-muted)]"
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="m-5 border border-black bg-white px-4 py-4 md:m-8">
          <p className="text-[13px] font-medium text-black">{error}</p>
          <button
            type="button"
            onClick={() => void loadProjects()}
            className="mt-3 text-[12px] underline underline-offset-4"
          >
            Volver a intentar
          </button>
        </div>
      ) : null}

      <section className="bg-white">
        <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(140px,.7fr)_100px_120px_minmax(200px,.9fr)] border-b border-[var(--border-1)] px-8 py-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--fg-muted)] lg:grid">
          <span>Proyecto</span>
          <span>Origen</span>
          <span>Avance</span>
          <span>Entrega</span>
          <span className="text-right">Acciones</span>
        </div>

        {loading ? (
          <ProjectSkeleton />
        ) : filteredProjects.length === 0 && !error ? (
          <div className="px-5 py-20 text-center md:px-8">
            <IconLayout size={20} className="mx-auto" />
            <p className="mt-4 text-[14px] font-medium text-black">
              {projects.length === 0
                ? "No hay proyectos disponibles para esta cuenta."
                : "Ningún proyecto coincide con el filtro."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-1)]">
            {filteredProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                saving={savingId === project.id}
                relatedHint={
                  (() => {
                    const code = project.family_code?.trim().toLowerCase();
                    if (code && (familyCounts.get(code) ?? 0) > 1) {
                      return `Familia ${code} · ${familyCounts.get(code)}`;
                    }
                    const root = nameRoot(project.name || project.id);
                    if (root && (familyCounts.get(`~${root}`) ?? 0) > 1) {
                      return `Posible grupo · ${root}`;
                    }
                    return null;
                  })()
                }
                onInvite={() => setInviteProject(project)}
                onRepositories={() => setRepositoryProject(project)}
                onTogglePriority={() =>
                  void patchMeta(project.id, {
                    delivery_priority: !project.delivery_priority,
                  })
                }
                onProgress={(pct) =>
                  void patchMeta(project.id, { progress_pct: pct })
                }
                onFamily={(code) =>
                  void patchMeta(project.id, { family_code: code })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "whitespace-nowrap rounded-md border border-black bg-black px-3 py-2 font-mono text-[9px] uppercase tracking-[0.11em] text-white"
          : "whitespace-nowrap rounded-md border border-transparent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--fg-muted)] hover:border-[var(--border-1)] hover:text-black"
      }
    >
      {label}
    </button>
  );
}

function ProjectRow({
  project,
  saving,
  relatedHint,
  onInvite,
  onRepositories,
  onTogglePriority,
  onProgress,
  onFamily,
}: {
  project: Project;
  saving: boolean;
  relatedHint: string | null;
  onInvite: () => void;
  onRepositories: () => void;
  onTogglePriority: () => void;
  onProgress: (pct: number) => void;
  onFamily: (code: string | null) => void;
}) {
  const externalUrl = normalizeExternalUrl(project.domain || project.vercel_url);
  const active =
    project.category === "produccion" ||
    project.category === "activo" ||
    project.category === "en_revision";
  const pct = Math.max(0, Math.min(100, project.progress_pct ?? 0));

  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-[#fafaf8] lg:grid-cols-[minmax(0,1.1fr)_minmax(140px,.7fr)_100px_120px_minmax(200px,.9fr)] lg:items-center lg:px-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-shape shrink-0" data-active={active} />
          <h2 className="truncate text-[14px] font-medium tracking-[-0.02em]">
            {project.name}
          </h2>
          {project.delivery_priority ? (
            <span className="rounded-full border border-black px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]">
              Prioridad
            </span>
          ) : null}
          {hasDomain(project) ? (
            <span className="rounded-full border border-[var(--border-1)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
              Dominio
            </span>
          ) : (
            <span className="rounded-full border border-dashed border-[var(--border-1)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
              Sin dominio
            </span>
          )}
        </div>
        <p className="mt-1 truncate pl-[15px] font-mono text-[9px] text-[var(--fg-muted)]">
          {project.id}
          {relatedHint ? ` · ${relatedHint}` : ""}
        </p>
        <div className="mt-2 pl-[15px]">
          <input
            type="text"
            defaultValue={project.family_code ?? ""}
            disabled={saving}
            placeholder="Código familia (ej. vliving)"
            className="w-full max-w-[220px] rounded border border-[var(--border-1)] bg-[#f7f7f5] px-2 py-1 font-mono text-[10px]"
            onBlur={(e) => {
              const next = e.target.value.trim() || null;
              if ((project.family_code ?? null) !== next) onFamily(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      </div>

      <div className="min-w-0">
        {project.github_repo ? (
          <span className="inline-flex max-w-full items-center gap-1.5 font-mono text-[10px] text-[var(--fg-secondary)]">
            <IconGithub size={11} className="shrink-0" />
            <span className="truncate">{project.github_repo}</span>
          </span>
        ) : (
          <span className="font-mono text-[9px] text-[var(--fg-muted)]">
            Sin repositorio
          </span>
        )}
        {project.domain || project.vercel_url ? (
          <p className="mt-1 truncate font-mono text-[9px] text-[var(--fg-muted)]">
            {project.domain ?? project.vercel_url}
          </p>
        ) : null}
        <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          {CATEGORY_LABELS[project.category] ?? project.category}
        </p>
        {(project.repository_count ?? project.repositories?.length ?? 0) > 1 ? (
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em]">
            {project.repository_count ?? project.repositories.length} repositorios en el grupo
          </p>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums">{pct}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            disabled={saving}
            onChange={(e) => onProgress(Number(e.target.value))}
            className="w-full max-w-[90px]"
            aria-label="Porcentaje de avance"
          />
        </div>
        <div className="mt-1 h-1 w-full max-w-[100px] overflow-hidden rounded-full bg-black/10">
          <div className="h-full bg-black" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <button
          type="button"
          disabled={saving}
          onClick={onTogglePriority}
          className={
            project.delivery_priority
              ? "rounded-md border border-black bg-black px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
              : "rounded-md border border-[var(--border-1)] bg-white px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)]"
          }
        >
          {project.delivery_priority ? "Prioritario" : "Marcar"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={onRepositories}
          className="btn-ghost !min-h-9 !px-3"
          title="Agrupar repositorios"
        >
          <IconGithub size={12} />
          <span className="hidden xl:inline">
            Repos · {project.repository_count ?? project.repositories?.length ?? 0}
          </span>
        </button>
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !min-h-9 !px-3"
            aria-label={`Abrir ${project.name}`}
          >
            <IconExtLink size={12} />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onInvite}
          className="btn-ghost !min-h-9 !px-3"
          title="Invitar por WhatsApp"
        >
          <IconUsers size={12} />
          <span className="hidden sm:inline">Invitar</span>
        </button>
        <Link
          href={`/app/live/${encodeURIComponent(project.id)}`}
          className="btn-primary !min-h-9 !px-4"
        >
          <IconLayout size={12} /> Sala
        </Link>
      </div>
    </article>
  );
}

function ProjectSkeleton() {
  return (
    <div className="divide-y divide-[var(--border-1)]" aria-label="Cargando proyectos">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="grid animate-pulse gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(140px,.7fr)_100px_120px_minmax(200px,.9fr)] lg:px-8"
        >
          <div className="h-4 w-1/2 rounded bg-black/10" />
          <div className="h-4 w-2/3 rounded bg-black/10" />
          <div className="h-4 w-16 rounded bg-black/10" />
          <div className="h-4 w-16 rounded bg-black/10" />
          <div className="h-9 w-28 rounded bg-black/10 lg:justify-self-end" />
        </div>
      ))}
    </div>
  );
}
