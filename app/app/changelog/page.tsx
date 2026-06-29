"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconGithub, IconExtLink, IconActivity } from "@/components/brand/VFIcons";

type Category = "feat" | "fix" | "perf" | "refactor" | "other";
interface Entry {
  sha: string;
  date: string;
  message: string;
  category: Category;
  url: string;
  author?: string;
}

const REPO_URL = "https://github.com/turbillon50/vforge";

const CAT_STYLE: Record<Category, { dot: string; badge: string; label: string }> = {
  feat:     { dot: "#8b5cf6", badge: "bg-violet-500/10 text-violet-400 border-cyan-500/20",     label: "NUEVO" },
  fix:      { dot: "#22c55e", badge: "bg-green-500/10 text-green-400 border-green-500/20",   label: "FIX" },
  perf:     { dot: "#fbbf24", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "PERF" },
  refactor: { dot: "#a78bfa", badge: "bg-violet-500/10 text-violet-300 border-violet-500/20", label: "REFACTOR" },
  other:    { dot: "#a78bfa", badge: "bg-violet-500/10 text-violet-300 border-violet-500/20", label: "OTRO" },
};

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Agrupa por día relativo: Hoy, Ayer, Esta semana, o mes (ej. "Mayo 2026").
function groupLabel(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const today = startOfDay(now);
  const day = startOfDay(date);
  const diffDays = Math.round((today - day) / 86_400_000);
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return "Esta semana";
  if (diffDays < 30) return "Este mes";
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000); if (d >= 1) return d + "d";
  const h = Math.floor(ms / 3_600_000); if (h >= 1) return h + "h";
  const m = Math.floor(ms / 60_000); if (m >= 1) return m + "m";
  return "ahora";
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/changelog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok: boolean; entries: Entry[]; error?: string }) => {
        if (!d.ok && d.error) setError(d.error);
        setEntries(d.entries ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Conserva el orden de aparición de los grupos (la API viene ordenada desc).
  const groups: { label: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const label = groupLabel(e.date);
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push(e);
  }

  return (
    <>
      <PageHeader
        eyebrow="Momentum"
        title="Changelog"
        description="Cada mejora, en tiempo real. Alimentado desde el repositorio."
        actions={
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3.5 py-2 text-[13px] font-medium text-[var(--fg-secondary)] transition hover:border-violet-500/30 hover:text-[var(--fg-primary)]"
          >
            <IconGithub size={14} /> Ver en GitHub
          </a>
        }
      />

      <div className="mx-auto w-full max-w-2xl px-5 py-6 md:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-xl border border-[var(--border-1)] bg-white/[0.015]" />
            ))}
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div className="py-16 text-center">
            <IconActivity size={28} className="mx-auto text-[var(--fg-subtle)]" />
            <p className="mt-3 font-display text-lg text-[var(--fg-tertiary)]">Sin entradas todavía.</p>
            <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
              Cuando llegue un commit nuevo, aparecerá aquí automáticamente.
            </p>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="sticky top-0 z-10 mb-3 bg-[var(--color-void)]/80 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400 backdrop-blur-sm">
                  {group.label}
                </h2>
                <ol className="relative space-y-2 border-l border-[var(--border-1)] pl-5">
                  {group.items.map((ev) => {
                    const cat = CAT_STYLE[ev.category] ?? CAT_STYLE.other;
                    return (
                      <li key={ev.sha} className="relative">
                        <span
                          className="absolute -left-[22px] top-2 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--color-void)]"
                          style={{ background: cat.dot, boxShadow: `0 0 7px ${cat.dot}` }}
                        />
                        <div className="overflow-hidden rounded-xl border border-[var(--border-1)] bg-[#0a0a12] p-4 transition hover:border-violet-500/25">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${cat.badge}`}>
                                {cat.label}
                              </span>
                              <p className="min-w-0 font-display text-[13.5px] font-semibold text-[var(--fg-primary)]">
                                {ev.message}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-[var(--fg-muted)]">
                              {timeAgo(ev.date)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-[var(--fg-muted)]">
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--fg-tertiary)] transition hover:text-violet-300"
                            >
                              {ev.sha}
                              <IconExtLink size={10} />
                            </a>
                            {ev.author && (
                              <span className="truncate font-mono text-[11px]">· {ev.author}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
