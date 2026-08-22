"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconExtLink,
  IconGithub,
  IconLayout,
  IconRefresh,
  IconSearch,
} from "@/components/brand/VFIcons";

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

type Filter = "all" | "produccion" | "revision" | "pausa";

const CATEGORY_LABELS: Record<string, string> = {
  produccion: "Producción",
  activo: "Activo",
  en_revision: "En revisión",
  en_pausa: "En pausa",
  archivo: "Archivado",
  pendiente_borrado: "Pendiente de borrar",
};

function categoryMatches(category: string, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "produccion") return category === "produccion";
  if (filter === "revision") {
    return category === "activo" || category === "en_revision";
  }
  return category === "en_pausa";
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesCategory = categoryMatches(project.category, filter);
      const matchesSearch =
        !needle ||
        project.name.toLowerCase().includes(needle) ||
        project.id.toLowerCase().includes(needle) ||
        (project.domain ?? "").toLowerCase().includes(needle) ||
        (project.github_repo ?? "").toLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [filter, projects, search]);

  const productionCount = projects.filter(
    (project) => project.category === "produccion",
  ).length;
  const reviewCount = projects.filter(
    (project) =>
      project.category === "activo" || project.category === "en_revision",
  ).length;

  const filters: { id: Filter; label: string }[] = [
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
              Abre una sala para comparar escritorio, móvil y administración;
              revisar actividad y recibir comentarios con permisos por proyecto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadProjects(true)}
            disabled={refreshing}
            className="btn-ghost self-start md:self-auto"
          >
            <IconRefresh size={13} className={refreshing ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </header>

      <section className="border-b border-[var(--border-1)] bg-[#f7f7f5] px-5 py-4 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto pb-1 lg:pb-0">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={
                  filter === item.id
                    ? "whitespace-nowrap rounded-md border border-black bg-black px-3 py-2 font-mono text-[9px] uppercase tracking-[0.11em] text-white"
                    : "whitespace-nowrap rounded-md border border-transparent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--fg-muted)] hover:border-[var(--border-1)] hover:text-black"
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="flex min-h-10 w-full items-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-3 lg:w-[300px]">
            <IconSearch size={13} className="shrink-0 text-[var(--fg-muted)]" />
            <span className="sr-only">Buscar proyectos</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar proyecto, dominio o repo"
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
        <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(180px,.8fr)_150px_220px] border-b border-[var(--border-1)] px-8 py-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--fg-muted)] md:grid">
          <span>Proyecto</span>
          <span>Origen</span>
          <span>Estado</span>
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
            <p className="mx-auto mt-2 max-w-md text-[12px] leading-5">
              {projects.length === 0
                ? "Cuando el catálogo tenga proyectos autorizados aparecerán aquí; no mostramos ejemplos inventados."
                : "Cambia el filtro o limpia la búsqueda."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-1)]">
            {filteredProjects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const externalUrl = normalizeExternalUrl(project.domain || project.vercel_url);
  const active =
    project.category === "produccion" ||
    project.category === "activo" ||
    project.category === "en_revision";

  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-[#fafaf8] md:grid-cols-[minmax(0,1.2fr)_minmax(180px,.8fr)_150px_220px] md:items-center md:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="status-shape shrink-0" data-active={active} />
          <h2 className="truncate text-[14px] font-medium tracking-[-0.02em]">
            {project.name}
          </h2>
        </div>
        <p className="mt-1 truncate pl-[15px] font-mono text-[9px] text-[var(--fg-muted)]">
          {project.id}
        </p>
      </div>

      <div className="min-w-0 md:pl-0">
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
      </div>

      <div className="flex items-center gap-2">
        <span
          className="status-shape"
          data-active={project.category === "produccion"}
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-secondary)]">
          {CATEGORY_LABELS[project.category] ?? project.category}
        </span>
      </div>

      <div className="flex items-center gap-2 md:justify-end">
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !min-h-9 !px-3"
            aria-label={`Abrir ${project.name} en otra pestaña`}
          >
            <IconExtLink size={12} />
            <span className="hidden lg:inline">Sitio</span>
          </a>
        ) : null}
        <Link
          href={`/app/live/${encodeURIComponent(project.id)}`}
          className="btn-primary !min-h-9 !px-4"
        >
          <IconLayout size={12} /> Abrir sala
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
          className="grid animate-pulse gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.2fr)_minmax(180px,.8fr)_150px_220px] md:px-8"
        >
          <div className="h-4 w-1/2 rounded bg-black/10" />
          <div className="h-4 w-2/3 rounded bg-black/10" />
          <div className="h-4 w-20 rounded bg-black/10" />
          <div className="h-9 w-28 rounded bg-black/10 md:justify-self-end" />
        </div>
      ))}
    </div>
  );
}
