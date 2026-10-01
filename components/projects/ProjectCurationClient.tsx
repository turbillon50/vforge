"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  Clock3,
  ExternalLink,
  FolderPlus,
  GitBranch,
  Github,
  Link2,
  RefreshCw,
  Search,
  Undo2,
  X,
} from "lucide-react";

type LinkedProject = {
  repo_full_name: string;
  project_id: string;
  project_name: string;
  is_primary: boolean;
};

type CurationState = {
  repo_full_name: string;
  archived: boolean;
  archived_reason: string | null;
  archived_note: string | null;
  archived_at: string | null;
};

type RepoItem = {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  language: string | null;
  default_branch: string;
  pushed_at: string | null;
  updated_at: string | null;
  archived: boolean;
  fork: boolean;
  html_url: string;
  size_kb: number;
  topics: string[];
  linked_projects: LinkedProject[];
  curation: CurationState | null;
};

type ProjectOption = {
  id: string;
  name: string;
  category: string;
  status: string;
  repository_count: number;
};

type InventoryPayload = {
  repos: RepoItem[];
  projects: ProjectOption[];
  fetched_at: string;
};

type Suggestion = {
  root: string;
  name: string;
  repos: RepoItem[];
  lastPush: number;
};

const CATEGORY_OPTIONS = [
  { value: "en_revision", label: "En revisión" },
  { value: "activo", label: "Activo" },
  { value: "produccion", label: "Producción" },
  { value: "en_pausa", label: "En pausa" },
  { value: "archivo", label: "Archivado" },
] as const;

const STATUS_OPTIONS = [
  { value: "unknown", label: "Sin estado" },
  { value: "building", label: "Construyendo" },
  { value: "live", label: "Live" },
  { value: "idle", label: "En pausa" },
  { value: "error", label: "Con error" },
] as const;

const REASONS = [
  { value: "experimento", label: "Experimento" },
  { value: "demo_vieja", label: "Demo vieja" },
  { value: "copia", label: "Copia" },
  { value: "otro", label: "Otro" },
] as const;

const FIELD_CLASS =
  "w-full rounded-md border border-[var(--border-1)] bg-white px-3 py-2 text-[14px] text-black focus:border-black";

const GROUP_SUFFIXES = new Set([
  "app",
  "demo",
  "prod",
  "admin",
  "frontend",
  "front",
  "backend",
  "api",
  "web",
  "site",
  "preview",
  "live",
  "old",
  "new",
  "copy",
  "copia",
  "backup",
  "test",
  "mobile",
]);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function timeOf(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin push";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin push";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ago(value: string | null | undefined) {
  if (!value) return "Sin push";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return formatDate(value);
  const days = Math.max(0, Math.round(ms / 86_400_000));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 60) return `Hace ${days} días`;
  const months = Math.round(days / 30);
  if (months < 24) return `Hace ${months} meses`;
  return `Hace ${Math.round(months / 12)} años`;
}

function canonicalRoot(repoName: string) {
  const parts = repoName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean);

  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (GROUP_SUFFIXES.has(last) || /^v\d+$/.test(last)) parts.pop();
    else break;
  }
  return parts.join("-");
}

function displayNameFromRoot(root: string) {
  if (root === "vforge") return "VForge";
  return root
    .split("-")
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

/**
 * Un repo está "ordenado" cuando vive en un proyecto real (con más de un repo).
 * Ligado solo a su proyecto automático (un repo = un proyecto) sigue suelto:
 * es justo lo que hay que agrupar.
 */
function estaAgrupado(repo: RepoItem, tamanos: Map<string, number>) {
  return repo.linked_projects.some((p) => (tamanos.get(p.project_id) ?? 0) > 1);
}

function buildSuggestions(
  repos: RepoItem[],
  dismissed: Set<string>,
  tamanos: Map<string, number>,
): Suggestion[] {
  const groups = new Map<string, RepoItem[]>();
  for (const repo of repos) {
    if (repo.curation?.archived) continue;
    if (estaAgrupado(repo, tamanos)) continue;
    const root = canonicalRoot(repo.name);
    if (!root || dismissed.has(root)) continue;
    groups.set(root, [...(groups.get(root) ?? []), repo]);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([root, group]) => ({
      root,
      name: displayNameFromRoot(root),
      repos: group.sort((a, b) => timeOf(b.pushed_at) - timeOf(a.pushed_at)),
      lastPush: Math.max(...group.map((repo) => timeOf(repo.pushed_at))),
    }))
    .sort((a, b) => b.repos.length - a.repos.length || b.lastPush - a.lastPush || a.name.localeCompare(b.name, "es"));
}

function selectedArray(selected: Set<string>) {
  return [...selected.values()];
}

export default function ProjectCurationClient() {
  const [payload, setPayload] = useState<InventoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("en_revision");
  const [status, setStatus] = useState("unknown");
  const [primaryRepo, setPrimaryRepo] = useState("");
  const [targetProject, setTargetProject] = useState("");
  const [archiveReason, setArchiveReason] = useState("experimento");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects/curar", { cache: "no-store" });
      const data = (await response.json()) as InventoryPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      setPayload(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const repos = useMemo(() => payload?.repos ?? [], [payload]);
  const projects = useMemo(() => payload?.projects ?? [], [payload]);
  const tamanos = useMemo(
    () => new Map(projects.map((p) => [p.id, p.repository_count])),
    [projects],
  );

  const visibleRepos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? repos.filter((repo) => {
          const hay = [
            repo.full_name,
            repo.description,
            repo.language,
            repo.linked_projects.map((p) => p.project_name).join(" "),
            repo.curation?.archived_reason,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return needle.split(/\s+/).every((word) => hay.includes(word));
        })
      : repos;
    return [...list].sort((a, b) => {
      const archived = Number(Boolean(a.curation?.archived)) - Number(Boolean(b.curation?.archived));
      return archived || timeOf(b.pushed_at) - timeOf(a.pushed_at) || a.full_name.localeCompare(b.full_name);
    });
  }, [query, repos]);

  const suggestions = useMemo(
    () => buildSuggestions(repos, dismissed, tamanos),
    [repos, dismissed, tamanos],
  );

  const selectedRepos = useMemo(
    () => selectedArray(selected).map((name) => repos.find((repo) => repo.full_name === name)).filter(Boolean) as RepoItem[],
    [repos, selected],
  );

  const stats = useMemo(() => {
    let linked = 0;
    let archived = 0;
    for (const repo of repos) {
      if (repo.curation?.archived) archived += 1;
      else if (estaAgrupado(repo, tamanos)) linked += 1;
    }
    return {
      total: repos.length,
      linked,
      pending: repos.length - linked - archived,
      archived,
    };
  }, [repos, tamanos]);

  function toggleRepo(repo: RepoItem) {
    if (repo.curation?.archived) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(repo.full_name)) next.delete(repo.full_name);
      else next.add(repo.full_name);
      const names = selectedArray(next);
      setPrimaryRepo((current) => (current && next.has(current) ? current : names[0] ?? ""));
      return next;
    });
  }

  function acceptSuggestion(group: Suggestion) {
    const names = group.repos.map((repo) => repo.full_name);
    setSelected(new Set(names));
    setProjectName(group.name);
    setPrimaryRepo(names[0] ?? "");
    // Si ya existe un proyecto real con ese nombre, se agrega ahí: nunca duplicar.
    const norma = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existente = projects.find(
      (p) => norma(p.id) === norma(group.root) || norma(p.name) === norma(group.root),
    );
    if (existente) {
      setTargetProject(existente.id);
      setMessage(`Ya existe "${existente.name}": usa "Agregar repos" para meterlos ahí.`);
    } else {
      setMessage(`Grupo listo: ${group.name}. Revisa el nombre y dale "Crear proyecto".`);
    }
  }

  async function mutate(action: string, body: Record<string, unknown>) {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/projects/curar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      setMessage(data.message ?? "Guardado.");
      if (action !== "undo_archive") {
        setSelected(new Set());
        setPrimaryRepo("");
      }
      if (action === "create_project") setProjectName("");
      await load(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  }

  const canCreate = selectedRepos.length > 0 && projectName.trim().length > 0 && !busy;
  const canAttach = selectedRepos.length > 0 && targetProject && !busy;
  const canArchive = selectedRepos.length > 0 && !busy;

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8">
        <header className="flex min-w-0 flex-col gap-4 border-b border-[var(--border-1)] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href="/app/projects" className="text-[12px] font-medium text-[var(--fg-muted)] hover:text-black">
              Proyectos
            </Link>
            <h1 className="mt-2 text-[30px] font-semibold leading-none text-black md:text-[42px]">
              Ordenar proyectos
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-4 text-[13px] font-semibold text-black hover:border-black disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refrescar
          </button>
        </header>

        <section className="grid border-b border-[var(--border-1)] bg-white md:grid-cols-4">
          <Stat label="Repos GitHub" value={String(stats.total)} />
          <Stat label="Por ordenar" value={String(stats.pending)} />
          <Stat label="Agrupados" value={String(stats.linked)} />
          <Stat label="No-proyecto" value={String(stats.archived)} />
        </section>

        {message ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-[var(--border-1)] bg-white px-4 py-3 text-[13px] font-medium text-black">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} aria-label="Cerrar mensaje">
              <X size={14} />
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-black bg-white px-4 py-3 text-[13px] font-medium text-black">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 overflow-hidden border border-[var(--border-1)] bg-white">
            <div className="flex flex-col gap-3 border-b border-[var(--border-1)] p-4 md:flex-row md:items-center md:justify-between">
              <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border-1)] bg-[var(--color-background)] px-3 focus-within:border-black">
                <Search size={15} className="shrink-0 text-[var(--fg-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar repo, lenguaje, proyecto"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-black placeholder:text-[var(--fg-muted)]"
                />
              </label>
              <p className="text-[12px] text-[var(--fg-muted)]">
                {selectedRepos.length} seleccionados
              </p>
            </div>

            {loading ? (
              <div className="grid gap-0 divide-y divide-[var(--border-1)]">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-[86px] animate-pulse bg-[var(--color-background)]" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-1)]">
                {visibleRepos.map((repo) => (
                  <RepoRow
                    key={repo.full_name}
                    repo={repo}
                    selected={selected.has(repo.full_name)}
                    primary={primaryRepo === repo.full_name}
                    busy={Boolean(busy)}
                    onToggle={() => toggleRepo(repo)}
                    onPrimary={() => setPrimaryRepo(repo.full_name)}
                    onUndo={() => void mutate("undo_archive", { repo_full_names: [repo.full_name] })}
                  />
                ))}
                {visibleRepos.length === 0 ? (
                  <div className="px-4 py-16 text-center text-[14px] text-[var(--fg-muted)]">
                    Sin resultados.
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <aside className="grid content-start gap-5 xl:sticky xl:top-5">
            <section className="border border-[var(--border-1)] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-black">Sugerencias</h2>
                <span className="rounded-full border border-[var(--border-1)] px-2 py-1 text-[12px] text-[var(--fg-muted)]">
                  {suggestions.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {suggestions.slice(0, 8).map((group) => (
                  <SuggestionRow
                    key={group.root}
                    group={group}
                    selected={selected}
                    onAccept={() => acceptSuggestion(group)}
                    onDismiss={() => setDismissed((prev) => new Set(prev).add(group.root))}
                    onToggle={(repo) => toggleRepo(repo)}
                  />
                ))}
                {suggestions.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-[var(--fg-muted)]">
                    No hay grupos pendientes.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="border border-[var(--border-1)] bg-white p-4">
              <div className="flex items-center gap-2">
                <FolderPlus size={16} />
                <h2 className="text-[16px] font-semibold text-black">Crear proyecto</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <Field label="Nombre">
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className={FIELD_CLASS}
                    placeholder="VForge"
                  />
                </Field>
                <Field label="Repo principal">
                  <select value={primaryRepo} onChange={(event) => setPrimaryRepo(event.target.value)} className={FIELD_CLASS}>
                    {selectedRepos.length === 0 ? <option value="">Selecciona repos</option> : null}
                    {selectedRepos.map((repo) => (
                      <option key={repo.full_name} value={repo.full_name}>
                        {repo.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Categoría">
                    <select value={category} onChange={(event) => setCategory(event.target.value)} className={FIELD_CLASS}>
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className={FIELD_CLASS}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={() =>
                    void mutate("create_project", {
                      name: projectName,
                      category,
                      status,
                      primary_repo: primaryRepo,
                      repo_full_names: selectedArray(selected),
                    })
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Check size={15} />
                  Crear proyecto
                </button>
              </div>
            </section>

            <section className="border border-[var(--border-1)] bg-white p-4">
              <div className="flex items-center gap-2">
                <Link2 size={16} />
                <h2 className="text-[16px] font-semibold text-black">Agregar a existente</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <Field label="Proyecto">
                  <select value={targetProject} onChange={(event) => setTargetProject(event.target.value)} className={FIELD_CLASS}>
                    <option value="">Selecciona proyecto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.repository_count})
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  disabled={!canAttach}
                  onClick={() =>
                    void mutate("add_to_project", {
                      project_id: targetProject,
                      primary_repo: primaryRepo,
                      repo_full_names: selectedArray(selected),
                    })
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-black bg-black px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Link2 size={15} />
                  Agregar repos
                </button>
              </div>
            </section>

            <section className="border border-[var(--border-1)] bg-white p-4">
              <div className="flex items-center gap-2">
                <Archive size={16} />
                <h2 className="text-[16px] font-semibold text-black">No-proyecto</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <Field label="Motivo">
                  <select value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} className={FIELD_CLASS}>
                    {REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  disabled={!canArchive}
                  onClick={() =>
                    void mutate("archive_repos", {
                      reason: archiveReason,
                      repo_full_names: selectedArray(selected),
                    })
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-4 text-[13px] font-semibold text-black hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Archive size={15} />
                  Marcar como no-proyecto
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-[var(--border-1)] px-4 py-3 md:border-b-0 md:px-6">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none text-black">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function RepoRow({
  repo,
  selected,
  primary,
  busy,
  onToggle,
  onPrimary,
  onUndo,
}: {
  repo: RepoItem;
  selected: boolean;
  primary: boolean;
  busy: boolean;
  onToggle: () => void;
  onPrimary: () => void;
  onUndo: () => void;
}) {
  const archived = Boolean(repo.curation?.archived);
  const linked = repo.linked_projects.length > 0;
  return (
    <article className={cx("grid gap-3 px-4 py-3 md:grid-cols-[32px_minmax(0,1fr)_180px_150px] md:items-center", archived && "bg-[var(--color-background)] opacity-75")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={archived || busy}
        aria-label={selected ? `Quitar ${repo.full_name}` : `Seleccionar ${repo.full_name}`}
        className={cx(
          "grid h-8 w-8 place-items-center rounded-md border",
          selected ? "border-black bg-black text-white" : "border-[var(--border-1)] bg-white text-black",
          archived && "cursor-not-allowed",
        )}
      >
        {selected ? <Check size={15} /> : null}
      </button>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-black hover:underline"
          >
            <Github size={14} className="shrink-0" />
            <span className="truncate" title={repo.full_name}>{repo.name}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
          {primary ? <Badge>principal</Badge> : null}
          {linked ? <Badge>{repo.linked_projects.map((p) => p.project_name).join(", ")}</Badge> : null}
          {archived ? <Badge>no-proyecto</Badge> : null}
        </div>
        <p className="mt-1 line-clamp-1 text-[12px] text-[var(--fg-muted)]">
          {repo.description || "Sin descripción"}
        </p>
      </div>

      <div className="grid gap-1 text-[12px] text-[var(--fg-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={13} />
          {ago(repo.pushed_at)}
        </span>
        <span>{formatDate(repo.pushed_at)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
          <GitBranch size={13} />
          {repo.language || repo.default_branch}
        </span>
        {selected && !primary ? (
          <button type="button" onClick={onPrimary} className="rounded-md border border-[var(--border-1)] px-2 py-1 text-[12px] font-medium hover:border-black">
            Principal
          </button>
        ) : null}
        {archived ? (
          <button
            type="button"
            onClick={onUndo}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border-1)] bg-white px-2 py-1 text-[12px] font-medium hover:border-black disabled:opacity-50"
          >
            <Undo2 size={12} />
            Deshacer
          </button>
        ) : null}
      </div>
    </article>
  );
}

function SuggestionRow({
  group,
  selected,
  onAccept,
  onDismiss,
  onToggle,
}: {
  group: Suggestion;
  selected: Set<string>;
  onAccept: () => void;
  onDismiss: () => void;
  onToggle: (repo: RepoItem) => void;
}) {
  return (
    <article className="border border-[var(--border-1)] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-black">{group.name}</h3>
          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
            {group.repos.length} repos · {ago(group.repos[0]?.pushed_at)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-black bg-black px-2 text-[12px] font-medium text-white"
          >
            <Check size={12} />
            Aceptar
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Descartar ${group.name}`}
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-1)] hover:border-black"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-1">
        {group.repos.map((repo) => (
          <button
            key={repo.full_name}
            type="button"
            onClick={() => onToggle(repo)}
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--color-background)]"
          >
            <span
              className={cx(
                "grid h-4 w-4 shrink-0 place-items-center rounded-sm border",
                selected.has(repo.full_name) ? "border-black bg-black text-white" : "border-[var(--border-1)]",
              )}
            >
              {selected.has(repo.full_name) ? <Check size={10} /> : null}
            </span>
            <span className="min-w-0 truncate font-mono text-[12px] text-[var(--fg-secondary)]" title={repo.full_name}>
              {repo.name}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-1)] px-2 text-[11px] font-medium text-[var(--fg-muted)]">
      {children}
    </span>
  );
}
