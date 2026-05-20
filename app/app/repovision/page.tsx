"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  Activity,
  Archive,
  ExternalLink,
  GitBranch,
  Globe2,
  Lock,
  Rocket,
  Search,
  Sparkles,
  Star,
  Unlock,
  Zap,
} from "lucide-react";

interface RepoIntegrations {
  tracked: boolean;
  projectId: string | null;
  projectCategory: string | null;
  projectStatus: string | null;
  vercel_url: string | null;
  domain: string | null;
  last_audit_at: string | null;
}

interface Repo {
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
  html_url: string;
  pushed_at: string | null;
  stargazers_count: number;
  topics: string[];
  integrations: RepoIntegrations;
}

type Filter = "all" | "tracked" | "untracked" | "deployed" | "archived";

function shortRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  const days = Math.floor(ms / 86_400_000);
  if (days >= 30) return `${Math.floor(days / 30)}mes`;
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  return "<1h";
}

export default function RepoVisionPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [trackedCount, setTrackedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/repos", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { repos: Repo[]; tracked_count: number }) => {
        setRepos(d.repos ?? []);
        setTrackedCount(d.tracked_count ?? 0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos.filter((r) => {
      if (filter === "tracked" && !r.integrations.tracked) return false;
      if (filter === "untracked" && r.integrations.tracked) return false;
      if (filter === "deployed" && !r.integrations.vercel_url) return false;
      if (filter === "archived" && !r.archived) return false;
      if (filter === "all" && r.archived) return false;
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.language ?? "").toLowerCase().includes(q)
      );
    });
  }, [repos, filter, query]);

  return (
    <>
      <PageHeader
        eyebrow="repos · github"
        title="Tus repositorios"
        description="Todo lo que tienes en GitHub y a qué está conectado en VForge."
        actions={
          <Link href="/app/chat" className="btn-primary">
            <Sparkles size={13} /> Pedir a V
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 px-5 pt-6 md:grid-cols-4 md:px-8">
        <Stat label="Total repos" value={String(repos.length)} tone="violet" />
        <Stat
          label="Tracked en V"
          value={`${trackedCount} / ${repos.length}`}
          tone="cyan"
        />
        <Stat
          label="Con deploy"
          value={String(repos.filter((r) => r.integrations.vercel_url).length)}
          tone="emerald"
        />
        <Stat
          label="Archivados"
          value={String(repos.filter((r) => r.archived).length)}
          tone="crimson"
        />
      </div>

      <div className="flex flex-col gap-3 px-5 pt-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Activos"],
              ["tracked", "Tracked"],
              ["untracked", "Untracked"],
              ["deployed", "Con deploy"],
              ["archived", "Archivados"],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={
                filter === k
                  ? "rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-violet-300"
                  : "rounded-md border border-app bg-tint-1 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-violet-500/30 hover:text-violet-300"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar repo, lenguaje, descripción…"
            className="w-full rounded-md border border-app bg-tint-1 pl-8 pr-3 py-1.5 text-[13px] text-on-surface placeholder:text-muted focus:border-violet-500/40 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-md border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson md:mx-8">
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[200px] rounded-xl border border-app bg-tint-1/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="mx-auto max-w-md p-10 text-center text-on-surface-variant">
          <p className="font-display text-lg">Nada que mostrar con esos filtros.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
        {filtered.map((r) => (
          <RepoCard key={r.full_name} repo={r} />
        ))}
      </div>
    </>
  );
}

function RepoCard({ repo: r }: { repo: Repo }) {
  const i = r.integrations;
  return (
    <article className="flex flex-col rounded-xl border border-app bg-tint-1 p-4 transition hover:border-violet-500/30">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <GitBranch size={13} className="shrink-0 text-violet-300" />
            <a
              href={r.html_url}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-[13px] font-medium text-on-surface hover:text-violet-300"
            >
              {r.full_name}
            </a>
            {r.private ? (
              <Lock size={11} className="shrink-0 text-muted" />
            ) : (
              <Unlock size={11} className="shrink-0 text-success-emerald" />
            )}
            {r.fork && (
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                fork
              </span>
            )}
          </div>
          {r.description && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-on-surface-variant">
              {r.description}
            </p>
          )}
        </div>
        {i.tracked && (
          <span className="chip shrink-0 text-violet-300" title="Tracked en V">
            ● V
          </span>
        )}
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        {r.language && (
          <span className="chip text-on-surface-variant">{r.language}</span>
        )}
        {i.projectCategory && (
          <span
            className={
              i.projectCategory === "produccion"
                ? "chip text-success-emerald"
                : "chip text-cyber-cyan"
            }
          >
            {i.projectCategory}
          </span>
        )}
        {r.stargazers_count > 0 && (
          <span className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
            <Star size={9} /> {r.stargazers_count}
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">
          push {shortRelative(r.pushed_at)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-app pt-3">
        <Integration
          icon={<Activity size={11} />}
          label="V"
          active={i.tracked}
          value={
            i.tracked
              ? `${i.projectStatus ?? "tracked"} · audit ${shortRelative(i.last_audit_at)}`
              : "no tracked"
          }
        />
        <Integration
          icon={<Rocket size={11} />}
          label="Vercel"
          active={!!i.vercel_url}
          value={
            i.vercel_url
              ? i.vercel_url.replace(/^https?:\/\//, "")
              : "no deploy"
          }
          href={i.vercel_url ?? undefined}
        />
        <Integration
          icon={<Globe2 size={11} />}
          label="Dominio"
          active={!!i.domain}
          value={i.domain ?? "—"}
          href={i.domain ? `https://${i.domain}` : undefined}
        />
        {r.archived && (
          <Integration
            icon={<Archive size={11} />}
            label="Archivo"
            active={false}
            value="archivado en GitHub"
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-app pt-3">
        <Link
          href={`/app/chat?project=${i.projectId ?? ""}&q=${encodeURIComponent(`cuéntame de ${r.name}`)}`}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
        >
          <Zap size={10} /> Preguntar a V
        </Link>
        <a
          href={r.html_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-on-surface"
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>
    </article>
  );
}

function Integration({
  icon,
  label,
  active,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  value: string;
  href?: string;
}) {
  const valueNode = (
    <span
      className={
        active
          ? "truncate text-[11px] text-on-surface"
          : "truncate text-[11px] text-muted/60"
      }
    >
      {value}
    </span>
  );
  return (
    <div className="flex min-w-0 items-center gap-2 text-[11px]">
      <span
        className={
          active ? "text-violet-300 shrink-0" : "text-muted/50 shrink-0"
        }
      >
        {icon}
      </span>
      <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate hover:text-violet-300"
        >
          {valueNode}
        </a>
      ) : (
        <span className="min-w-0 flex-1 truncate">{valueNode}</span>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "cyan" | "emerald" | "crimson";
}) {
  const m = {
    violet: "text-violet-300",
    cyan: "text-cyber-cyan",
    emerald: "text-success-emerald",
    crimson: "text-error-crimson",
  };
  return (
    <div className="rounded-xl border border-app bg-tint-1 p-4">
      <p className="label-caps text-muted">{label}</p>
      <p className={`mt-2 font-display text-lg font-semibold ${m[tone]}`}>{value}</p>
    </div>
  );
}
