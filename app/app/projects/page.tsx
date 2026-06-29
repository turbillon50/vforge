"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconActivity,
  IconExtLink,
  IconBranch,
  IconGlobe,
  IconLayers,
  IconSparkles,
  IconUsers,
  IconX,
  IconCode,
  IconPlus,
} from "@/components/brand/VFIcons";
import { useT, interpolate } from "@/i18n/AppProviders";
import InviteModal, {
  MemberStack,
  scopeLabel,
  scopeColor,
  type Member,
} from "@/components/projects/InviteModal";

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
  const [inviteProject, setInviteProject] = useState<{ id: string; name: string } | null>(null);
  const [detailProject, setDetailProject] = useState<RealProject | null>(null);

  // Miembros por proyecto (cache compartido tarjeta ↔ detalle ↔ modal).
  const [membersByProject, setMembersByProject] = useState<Record<string, Member[]>>({});

  const handleMembersChange = useCallback((projectId: string, members: Member[]) => {
    setMembersByProject((prev) => ({ ...prev, [projectId]: members }));
  }, []);

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

  // Carga perezosa de miembros de cada proyecto para la pila de avatares.
  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;
    (async () => {
      await Promise.all(
        projects.map(async (p) => {
          try {
            const r = await fetch(`/api/invitations?project_id=${encodeURIComponent(p.id)}`, {
              cache: "no-store",
            });
            if (!r.ok) return;
            const d = (await r.json()) as { members: Member[] };
            if (!cancelled) {
              setMembersByProject((prev) => ({ ...prev, [p.id]: d.members ?? [] }));
            }
          } catch {
            /* proyecto sin miembros o error puntual: ignorar */
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const filtered = projects.filter((p) => {
    if (filter === "all") return true;
    return (STATUS_FROM_CATEGORY[p.category] ?? "draft") === filter;
  });

  const liveCount = projects.filter((p) => STATUS_FROM_CATEGORY[p.category] === "live").length;
  const previewCount = projects.filter((p) => STATUS_FROM_CATEGORY[p.category] === "preview").length;

  const detailMembers = detailProject ? membersByProject[detailProject.id] ?? [] : [];

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
                  ? "border-violet-400/50 bg-violet-400/10 text-violet-400"
                  : "border-violet-500/50 bg-violet-500/10 text-violet-300"
                : "border-[var(--border-1)] text-muted hover:border-[var(--border-2)] hover:text-on-surface"
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
              className="h-[300px] rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] animate-pulse"
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
          const members = membersByProject[p.id] ?? [];

          return (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: idx * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[#0e0e16] transition-all duration-300 hover:border-violet-500/30 hover:shadow-glow-violet"
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
                      <span className="flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-400/8 px-2.5 py-1 font-mono text-[10px] text-violet-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        Preview
                      </span>
                    )}
                    {status === "draft" && (
                      <span className="flex items-center gap-1.5 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 py-1 font-mono text-[10px] text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                        Draft
                      </span>
                    )}
                    {status === "archived" && (
                      <span className="rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 py-1 font-mono text-[10px] text-muted">
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
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
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
                            ? "linear-gradient(90deg, #8b5cf6, #67e8f9)"
                            : "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                      }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Stack</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-on-surface">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: langColor }}
                      />
                      {p.github_language ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Deploy</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-on-surface">
                      <IconActivity size={11} className={status === "live" ? "text-emerald-400" : "text-muted"} />
                      {p.vercel_url ? "Vercel" : "Sin deploy"}
                    </p>
                  </div>
                </div>

                {/* Repo */}
                {p.github_repo && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2">
                    <IconBranch size={11} className="shrink-0 text-muted" />
                    <span className="truncate font-mono text-[11px] text-muted">
                      {p.github_repo}
                    </span>
                  </div>
                )}

                {/* Participantes */}
                <div className="mt-3 flex h-6 items-center gap-2">
                  {members.length > 0 ? (
                    <>
                      <MemberStack members={members} />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {members.length === 1 ? "1 participante" : `${members.length} participantes`}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted/70">
                      <IconUsers size={11} /> Sin participantes
                    </span>
                  )}
                </div>
              </div>

              {/* Footer — acciones por proyecto */}
              <div className="flex items-center gap-2 border-t border-[var(--border-1)] px-5 py-3">
                <button
                  onClick={() => setDetailProject(p)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-on-surface transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
                >
                  <IconExtLink size={11} />
                  Abrir
                </button>
                <button
                  onClick={() => setInviteProject({ id: p.id, name: p.name })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-violet-200 transition-all hover:border-violet-400/60 hover:bg-violet-500/20"
                >
                  <IconPlus size={11} />
                  Invitar
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Panel de detalle del proyecto (drawer lateral) */}
      <AnimatePresence>
        {detailProject && (
          <motion.div
            className="fixed inset-0 z-[110] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              aria-label="Cerrar"
              onClick={() => setDetailProject(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--border-1)] bg-[#0c0c14] shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-violet-400/40 to-transparent" />

              <div className="flex items-start justify-between gap-3 border-b border-[var(--border-1)] px-6 py-5">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400">
                    Detalle de proyecto
                  </p>
                  <h2 className="mt-1 truncate font-display text-xl font-semibold text-on-surface">
                    {detailProject.name}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <IconGlobe size={11} className="shrink-0 text-muted" />
                    <p className="truncate font-mono text-[11px] text-muted">
                      {detailProject.domain || detailProject.vercel_url?.replace(/^https?:\/\//, "") || "—"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailProject(null)}
                  className="shrink-0 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] p-2 text-muted transition-colors hover:border-[var(--border-2)] hover:text-on-surface"
                >
                  <IconX size={15} />
                </button>
              </div>

              <div className="space-y-3 px-6 py-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Estado</p>
                    <p className="mt-1 text-[13px] font-medium capitalize text-on-surface">
                      {STATUS_FROM_CATEGORY[detailProject.category] ?? "draft"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Stack</p>
                    <p className="mt-1 text-[13px] font-medium text-on-surface">
                      {detailProject.github_language ?? "—"}
                    </p>
                  </div>
                </div>

                {detailProject.github_repo && (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
                    <IconCode size={13} className="shrink-0 text-muted" />
                    <span className="truncate font-mono text-[12px] text-muted">{detailProject.github_repo}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {detailProject.vercel_url && (
                    <a
                      href={detailProject.vercel_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 text-sm font-medium text-on-surface transition-all hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]"
                    >
                      <IconExtLink size={14} /> Abrir deploy
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setInviteProject({ id: detailProject.id, name: detailProject.name });
                      setDetailProject(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-glow-violet transition-all hover:from-violet-500 hover:to-violet-400"
                  >
                    <IconUsers size={15} /> Invitar participante
                  </button>
                  <Link
                    href="/app/chat"
                    className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] px-4 py-3 text-sm font-medium text-violet-300 transition-all hover:bg-[var(--surface-1)]"
                  >
                    <IconSparkles size={14} /> {interpolate(t.projects.ask_b, { name: detailProject.name.split(" ")[0] })}
                  </Link>
                </div>

                {/* Participantes del proyecto */}
                <div className="border-t border-[var(--border-1)] pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <IconUsers size={14} className="text-muted" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Participantes {detailMembers.length > 0 && `(${detailMembers.length})`}
                    </p>
                  </div>

                  {detailMembers.length === 0 ? (
                    <p className="text-[13px] text-muted">Aún no hay participantes en este proyecto.</p>
                  ) : (
                    <ul className="space-y-2">
                      {detailMembers.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-3 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5"
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                            style={{ backgroundColor: scopeColor(m.scope) + "cc" }}
                          >
                            {(m.contact || m.email || "?").replace(/^\+/, "").trim()[0]?.toUpperCase() ?? "?"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-on-surface">{m.contact || m.email}</p>
                            <p
                              className="font-mono text-[10px] uppercase tracking-widest"
                              style={{ color: scopeColor(m.scope) }}
                            >
                              {scopeLabel(m.scope)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                              m.status === "active"
                                ? "border border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                                : m.status === "revoked"
                                  ? "border border-[var(--border-1)] bg-[var(--surface-1)] text-muted"
                                  : "border border-violet-400/30 bg-violet-400/8 text-violet-400"
                            }`}
                          >
                            {m.status === "active" ? "Activo" : m.status === "revoked" ? "Revocado" : "Invitado"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de invitación */}
      <InviteModal
        project={inviteProject}
        open={inviteProject !== null}
        onClose={() => setInviteProject(null)}
        onMembersChange={handleMembersChange}
      />
    </>
  );
}
