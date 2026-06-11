"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconActivity, IconExtLink, IconBranch, IconGlobe, IconLayers, IconRocket, IconSparkles } from "@/components/brand/VFIcons";
import { useT, interpolate } from "@/i18n/AppProviders";

interface RealProject {
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

const STATUS_FROM_CATEGORY: Record<string, "live" | "preview" | "draft" | "archived"> = {
  produccion: "live",
  activo: "preview",
  en_revision: "preview",
  en_pausa: "draft",
  archivo: "archived",
  pendiente_borrado: "archived",
};

const STATUS_PROGRESS: Record<string, number> = {
  live: 100,
  preview: 72,
  draft: 35,
  archived: 0,
};

const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3b82f6",
  JavaScript: "#eab308",
  Python: "#22c55e",
  Rust: "#f97316",
  Go: "#06b6d4",
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ProjectsPage() {
  const t = useT();
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "preview" | "draft">("all");

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { projects: RealProject[] }) => setProjects(d.projects ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    if (filter === "all") return true;
    return (STATUS_FROM_CATEGORY[p.category] ?? "draft") === filter;
  });

  const liveCount = projects.filter((p) => STATUS_FROM_CATEGORY[p.category] === "live").length;
  const previewCount = projects.filter((p) => STATUS_FROM_CATEGORY[p.category] === "preview").length;

  return (
    <>
      <PageHeader
        eyebrow={t.projects.eyebrow}
        title={t.projects.title}
        description={t.projects.body}
        actions={
          <>
            <button className="btn-ghost flex-1 !px-3 md:flex-none md:!px-5">{t.projects.cta_import}</button>
            <Link href="/app/chat" className="btn-primary flex-1 !px-3 md:flex-none md:!px-5">
              <IconSparkles size={13} /> {t.projects.cta_new}
            </Link>
          </>
        }
      />

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2 md:gap-3 md:px-8"
      >
        {(["all", "live", "preview", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-all ${
              filter === f
                ? f === "live"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : f === "preview"
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
                  : "border-violet-500/50 bg-violet-500/10 text-violet-300"
                : "border-white/8 text-muted hover:border-white/16 hover:text-on-surface"
            }`}
          >
            {f === "all" ? `Todos (${projects.length})` : f === "live" ? `● Live (${liveCount})` : f === "preview" ? `● Preview (${previewCount})` : "Draft"}
          </button>
        ))}
      </motion.div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson md:mx-8">
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
          {[0, 1, 2, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[300px] rounded-2xl border border-white/6 bg-white/3 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto max-w-md p-10 text-center text-on-surface-variant"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5">
            <IconLayers size={24} className="text-violet-400" />
          </div>
          <p className="font-display text-lg font-semibold">Aún no tienes proyectos</p>
          <p className="mt-2 text-sm opacity-60">Habla con V para dar de alta tu primer proyecto.</p>
          <Link href="/app/chat" className="btn-primary mt-5 inline-flex">
            <IconSparkles size={13} /> Hablar con V
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
        {filtered.map((p, idx) => {
          const status = STATUS_FROM_CATEGORY[p.category] ?? "draft";
          const domain = p.domain || p.vercel_url?.replace(/^https?:\/\//, "") || "—";
          const progress = STATUS_PROGRESS[status];
          const langColor = p.github_language ? (LANG_COLOR[p.github_language] ?? "#8b5cf6") : "#8b5cf6";

          return (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: idx * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#0e0e16] transition-all duration-300 hover:border-violet-500/30 hover:shadow-glow-violet"
            >
              {/* Crystal sheen top */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

              {/* Language accent bar */}
              <div
                className="absolute left-0 top-0 h-full w-0.5 opacity-60 transition-opacity group-hover:opacity-100"
                style={{ backgroundColor: langColor }}
              />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[17px] font-semibold tracking-tight text-on-surface truncate">
                      {p.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <IconGlobe size={10} className="shrink-0 text-muted" />
                      <p className="font-mono text-[11px] text-muted truncate">{domain}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {status === "live" && (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-2.5 py-1 font-mono text-[10px] text-emerald-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Live
                      </span>
                    )}
                    {status === "preview" && (
                      <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/8 px-2.5 py-1 font-mono text-[10px] text-cyan-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        Preview
                      </span>
                    )}
                    {status === "draft" && (
                      <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-2.5 py-1 font-mono text-[10px] text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                        Draft
                      </span>
                    )}
                    {status === "archived" && (
                      <span className="rounded-full border border-white/8 bg-white/3 px-2.5 py-1 font-mono text-[10px] text-muted">
                        Archivo
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Deployment progress
                    </span>
                    <span className="font-mono text-[10px] text-muted">{progress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/6">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: EASE, delay: idx * 0.05 + 0.2 }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          status === "live"
                            ? "linear-gradient(90deg, #10b981, #34d399)"
                            : status === "preview"
                            ? "linear-gradient(90deg, #22d3ee, #67e8f9)"
                            : "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                      }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Stack</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-on-surface">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: langColor }}
                      />
                      {p.github_language ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Deploy</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-on-surface">
                      <IconActivity size={11} className={status === "live" ? "text-emerald-400" : "text-muted"} />
                      {p.vercel_url ? "Vercel" : "Sin deploy"}
                    </p>
                  </div>
                </div>

                {/* Repo */}
                {p.github_repo && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-white/6 bg-white/3 px-3 py-2">
                    <IconBranch size={11} className="shrink-0 text-muted" />
                    <span className="truncate font-mono text-[11px] text-muted">
                      {p.github_repo}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/6 px-5 py-3">
                <Link href="/app/chat"
                  className="font-mono text-[10px] uppercase tracking-widest text-violet-400 transition-colors hover:text-violet-300"
                >
                  {interpolate(t.projects.ask_b, { name: p.name.split(" ")[0] })}
                </Link>
                {p.vercel_url ? (
                  <a
                    href={p.vercel_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] text-on-surface transition-all hover:border-white/20 hover:bg-white/8"
                  >
                    <IconExtLink size={10} />
                    Abrir
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
                    <IconRocket size={10} />
                    Sin URL
                  </span>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </>
  );
}
