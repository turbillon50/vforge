"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  GitBranch,
  Lock,
  Star,
  Search,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  CircleAlert,
  Archive,
  Sparkles,
  ChevronDown,
  CircleDot,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

interface Repo {
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  pushed_at: string | null;
  html_url: string;
  archived?: boolean;
  open_issues_count?: number;
  fork?: boolean;
}

type Health = "vivo" | "activo" | "pausa" | "abandonado" | "archivado";

const HEALTH_META: Record<
  Health,
  { label: string; dot: string; text: string; chipBorder: string }
> = {
  vivo: {
    label: "Vivo",
    dot: "bg-success-emerald",
    text: "text-success-emerald",
    chipBorder: "border-success-emerald/40",
  },
  activo: {
    label: "Activo",
    dot: "bg-violet-300",
    text: "text-violet-300",
    chipBorder: "border-violet-300/40",
  },
  pausa: {
    label: "En pausa",
    dot: "bg-on-surface-variant",
    text: "text-on-surface-variant",
    chipBorder: "border-app-strong",
  },
  abandonado: {
    label: "Abandonado",
    dot: "bg-error-crimson",
    text: "text-error-crimson",
    chipBorder: "border-error-crimson/40",
  },
  archivado: {
    label: "Archivado",
    dot: "bg-muted",
    text: "text-muted",
    chipBorder: "border-app-strong",
  },
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function classifyHealth(r: Repo): Health {
  if (r.archived) return "archivado";
  const d = daysSince(r.pushed_at);
  if (d === null) return "pausa";
  if (d < 14) return "vivo";
  if (d < 60) return "activo";
  if (d <= 180) return "pausa";
  return "abandonado";
}

function pushedLabel(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return "sin datos";
  if (d === 0) return "push hoy";
  if (d === 1) return "push hace 1d";
  return `push hace ${d}d`;
}

type Filter = "todos" | Health;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "vivo", label: "Vivos" },
  { id: "activo", label: "Activos" },
  { id: "pausa", label: "En pausa" },
  { id: "abandonado", label: "Abandonados" },
  { id: "archivado", label: "Archivados" },
];

export default function RepoVisionPage() {
  const t = useT();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);

  useEffect(() => {
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
  }, []);

  const enriched = useMemo(
    () => repos.map((r) => ({ ...r, health: classifyHealth(r) })),
    [repos],
  );

  const stats = useMemo(() => {
    let vivos = 0;
    let abandonados = 0;
    let privados = 0;
    for (const r of enriched) {
      if (r.health === "vivo") vivos += 1;
      if (r.health === "abandonado") abandonados += 1;
      if (r.private) privados += 1;
    }
    return { total: enriched.length, vivos, abandonados, privados };
  }, [enriched]);

  const cleanupCandidates = useMemo(
    () =>
      enriched.filter((r) => r.health === "abandonado" || r.health === "archivado"),
    [enriched],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = enriched.filter((r) => {
      if (filter !== "todos" && r.health !== filter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.full_name.toLowerCase().includes(q))
        return false;
      return true;
    });
    list.sort((a, b) => {
      const da = a.pushed_at ? new Date(a.pushed_at).getTime() : 0;
      const db = b.pushed_at ? new Date(b.pushed_at).getTime() : 0;
      return oldestFirst ? da - db : db - da;
    });
    return list;
  }, [enriched, filter, query, oldestFirst]);

  return (
    <>
      <PageHeader
        eyebrow={t.repovision.eyebrow}
        title={t.repovision.title}
        description={t.repovision.body}
      />

      <div className="px-5 py-6 md:px-8">
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
            <CircleAlert size={15} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Resumen hero */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Repositorios" value={stats.total} loading={loading} />
          <StatCard
            label="Vivos"
            value={stats.vivos}
            loading={loading}
            accent="text-success-emerald"
          />
          <StatCard
            label="Por limpiar"
            value={stats.abandonados}
            loading={loading}
            accent="text-error-crimson"
            hint="abandonados"
          />
          <StatCard label="Privados" value={stats.privados} loading={loading} />
        </div>

        {/* Controles */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${
                    active
                      ? "border-violet-400/50 bg-tint-3 text-on-surface"
                      : "border-app bg-tint-1 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar repo…"
                className="h-11 w-full rounded-lg border border-app bg-tint-1 pl-9 pr-3 text-sm text-on-surface placeholder:text-muted outline-none transition focus:border-violet-400/50"
              />
            </div>
            <button
              onClick={() => setOldestFirst((v) => !v)}
              title={oldestFirst ? "Más antiguos primero" : "Más recientes primero"}
              className="flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-app bg-tint-1 px-3 text-sm text-on-surface-variant transition hover:text-on-surface"
            >
              {oldestFirst ? (
                <ArrowUpNarrowWide size={16} />
              ) : (
                <ArrowDownNarrowWide size={16} />
              )}
              <span className="hidden sm:inline">
                {oldestFirst ? "Antiguos" : "Recientes"}
              </span>
            </button>
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-[140px] animate-pulse rounded-xl border border-app bg-tint-1"
              />
            ))}
          </div>
        )}

        {/* Vacío */}
        {!loading && enriched.length === 0 && !error && (
          <div className="rounded-xl border border-app bg-tint-1 p-10 text-center text-on-surface-variant">
            <GitBranch className="mx-auto mb-3 text-violet-300" size={24} />
            <p className="font-display text-lg text-on-surface">No hay repos cargados</p>
            <p className="mt-2 text-sm">
              Conéctate y vuelve a intentar, o revisa tu GitHub en Integraciones.
            </p>
          </div>
        )}

        {/* Sin resultados de filtro */}
        {!loading && enriched.length > 0 && visible.length === 0 && (
          <div className="rounded-xl border border-app bg-tint-1 p-8 text-center text-sm text-on-surface-variant">
            Ningún repositorio coincide con este filtro.
          </div>
        )}

        {/* Lista */}
        {!loading && visible.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((r) => (
              <RepoCard key={r.full_name} repo={r} health={r.health} />
            ))}
          </div>
        )}

        {/* Limpieza sugerida */}
        {!loading && cleanupCandidates.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-xl border border-app bg-tint-1">
            <button
              onClick={() => setCleanupOpen((v) => !v)}
              className="flex min-h-[44px] w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-violet-300" />
                <span className="font-display text-sm font-semibold text-on-surface">
                  Limpieza sugerida
                </span>
                <span className="rounded-full border border-app-strong bg-tint-2 px-2 py-0.5 text-xs tabular text-on-surface-variant">
                  {cleanupCandidates.length}
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`text-muted transition-transform ${cleanupOpen ? "rotate-180" : ""}`}
              />
            </button>

            {cleanupOpen && (
              <div className="border-t border-app px-5 py-4">
                <p className="mb-4 max-w-2xl text-sm text-on-surface-variant">
                  Estos repos no han tenido actividad en más de 6 meses. Considera
                  archivarlos o eliminarlos para mantener el ecosistema en orden. V
                  puede hacerlo por ti desde el chat, con confirmación.
                </p>
                <ul className="flex flex-col gap-2">
                  {cleanupCandidates.map((r) => {
                    const meta = HEALTH_META[r.health];
                    return (
                      <li key={r.full_name}>
                        <a
                          href={r.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-app bg-tint-2 px-3 py-2 transition hover:border-violet-400/30"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {r.health === "archivado" ? (
                              <Archive size={14} className="shrink-0 text-muted" />
                            ) : (
                              <CircleDot size={14} className="shrink-0 text-error-crimson" />
                            )}
                            <span className="truncate text-sm text-on-surface">
                              {r.full_name}
                            </span>
                          </span>
                          <span className={`shrink-0 text-xs tabular ${meta.text}`}>
                            {pushedLabel(r.pushed_at)}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  loading,
  accent,
  hint,
}: {
  label: string;
  value: number;
  loading: boolean;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="relative rounded-xl border border-app bg-tint-1 px-4 py-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <p className="label-caps text-on-surface-variant">{label}</p>
      <p
        className={`mt-2 font-display text-3xl font-semibold tabular ${accent ?? "text-on-surface"}`}
      >
        {loading ? "—" : value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function RepoCard({ repo, health }: { repo: Repo; health: Health }) {
  const meta = HEALTH_META[health];
  const issues = repo.open_issues_count ?? 0;
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="group relative flex min-h-[44px] flex-col rounded-xl border border-app bg-tint-1 p-4 transition hover:border-violet-400/30"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="shrink-0 text-violet-300" />
            <p className="truncate font-display font-semibold text-on-surface">
              {repo.name}
            </p>
            {repo.private && <Lock size={11} className="shrink-0 text-muted" />}
          </div>
          <p className="mt-1 truncate text-xs text-muted">{repo.full_name}</p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border bg-tint-2 px-2.5 py-1 text-xs font-medium ${meta.chipBorder} ${meta.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {repo.description && (
        <p className="mt-3 line-clamp-2 text-sm text-on-surface-variant">
          {repo.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-muted">
        {repo.language && <span className="text-cyber-cyan">{repo.language}</span>}
        <span className="tabular">{repo.default_branch}</span>
        <span className="tabular">{pushedLabel(repo.pushed_at)}</span>
        <span className="flex items-center gap-1 tabular">
          <Star size={11} /> {repo.stargazers_count}
        </span>
        {issues > 0 && (
          <span className="flex items-center gap-1 tabular">
            <CircleDot size={11} /> {issues}
          </span>
        )}
      </div>

      {health === "abandonado" && (
        <p className="mt-2 text-xs text-error-crimson/80">Candidato a limpiar</p>
      )}
    </a>
  );
}
