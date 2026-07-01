"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconSparkles,
  IconUsers,
  IconPlus,
  IconExtLink,
  IconX,
  IconCode,
  IconGlobe,
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

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function initials(name: string): string {
  return name
    .split(/[s-_]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function nameToHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

type FilterTab = "all" | "live" | "preview" | "draft";

export default function ProjectsPage() {
  const t = useT();
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [inviteProject, setInviteProject] = useState<{ id: string; name: string } | null>(null);
  const [detailProject, setDetailProject] = useState<RealProject | null>(null);
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

  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;
    (async () => {
      await Promise.all(
        projects.map(async (p) => {
          try {
            const r = await fetch(`/api/invitations?project_id=${encodeURIComponent(p.id)}`, { cache: "no-store" });
            if (!r.ok) return;
            const d = (await r.json()) as { members: Member[] };
            if (!cancelled) setMembersByProject((prev) => ({ ...prev, [p.id]: d.members ?? [] }));
          } catch { /* ignore */ }
        }),
      );
    })();
    return () => { cancelled = true; };
  }, [projects]);

  const filtered = projects.filter((p) => {
    const matchTab =
      filter === "all" ? true : (STATUS_FROM_CATEGORY[p.category] ?? "draft") === filter;
    const matchSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.domain ?? "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const liveCount = projects.filter((p) => STATUS_FROM_CATEGORY[p.category] === "live").length;
  const previewCount = projects.filter((p) => STATUS_FROM_CATEGORY[p.category] === "preview").length;
  const detailMembers = detailProject ? membersByProject[detailProject.id] ?? [] : [];

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: `Todos (${projects.length})` },
    { key: "live", label: `Live (${liveCount})` },
    { key: "preview", label: `Preview (${previewCount})` },
    { key: "draft", label: "Draft" },
  ];

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

      {/* Tabs + search bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-1)] px-5 md:px-8">
        <div className="flex items-center gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`relative px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                filter === tab.key
                  ? "text-on-surface"
                  : "text-muted hover:text-on-surface-variant"
              }`}
            >
              {tab.label}
              {filter === tab.key && (
                <motion.span
                  layoutId="projects-tab-indicator"
                  className="absolute inset-x-0 bottom-0 h-px bg-violet-400"
                />
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proyecto..."
          className="w-48 rounded-lg border border-[var(--border-1)] bg-transparent px-3 py-1.5 font-mono text-[12px] text-on-surface placeholder-muted outline-none transition focus:border-violet-500/50 focus:ring-0"
        />
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400 md:mx-8">
          ⚠ {error}
        </div>
      )}

      {/* Project list */}
      <div className="divide-y divide-[var(--border-1)]">
        {loading &&
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 md:px-8">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-36 animate-pulse rounded bg-[var(--surface-2)]" />
                <div className="h-2.5 w-52 animate-pulse rounded bg-[var(--surface-2)]" />
              </div>
            </div>
          ))}

        {!loading && filtered.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center text-on-surface-variant"
          >
            <p className="font-display text-base font-semibold">Sin proyectos</p>
            <p className="mt-1 text-sm opacity-60">
              {search ? "Intenta con otro término." : "Habla con V para crear tu primer proyecto."}
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {!loading &&
            filtered.map((p, idx) => {
              const status = STATUS_FROM_CATEGORY[p.category] ?? "draft";
              const domain = p.domain || p.vercel_url?.replace(/^https?:\/\//, "") || null;
              const hue = nameToHue(p.id);
              const avatarBg = `hsl(${hue}, 60%, 28%)`;
              const avatarFg = `hsl(${hue}, 80%, 75%)`;
              const members = membersByProject[p.id] ?? [];

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE, delay: idx * 0.03 }}
                  className="group flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] md:px-8"
                  onClick={() => setDetailProject(p)}
                >
                  {/* Avatar */}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                    style={{ backgroundColor: avatarBg, color: avatarFg }}
                  >
                    {initials(p.name)}
                  </span>

                  {/* Name + domain */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-on-surface">{p.name}</p>
                    {domain && (
                      <p className="truncate font-mono text-[11px] text-muted">{domain}</p>
                    )}
                  </div>

                  {/* Member stack */}
                  {members.length > 0 && (
                    <div className="hidden shrink-0 sm:block">
                      <MemberStack members={members} />
                    </div>
                  )}

                  {/* Status dot */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        status === "live"
                          ? "bg-emerald-400"
                          : status === "preview"
                          ? "bg-violet-400"
                          : "bg-zinc-600"
                      } ${status === "live" ? "animate-pulse" : ""}`}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted hidden sm:block">
                      {status}
                    </span>
                  </div>

                  {/* Invite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInviteProject({ id: p.id, name: p.name });
                    }}
                    className="shrink-0 rounded-md border border-violet-500/30 bg-violet-500/8 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-violet-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-violet-500/20"
                  >
                    <IconPlus size={10} />
                  </button>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Detail drawer */}
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
                    Detalle
                  </p>
                  <h2 className="mt-1 truncate font-display text-xl font-semibold text-on-surface">
                    {detailProject.name}
                  </h2>
                  {(detailProject.domain || detailProject.vercel_url) && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <IconGlobe size={11} className="shrink-0 text-muted" />
                      <p className="truncate font-mono text-[11px] text-muted">
                        {detailProject.domain || detailProject.vercel_url?.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setDetailProject(null)}
                  className="shrink-0 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] p-2 text-muted transition-colors hover:text-on-surface"
                >
                  <IconX size={15} />
                </button>
              </div>

              <div className="space-y-3 px-6 py-6">
                {detailProject.github_repo && (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
                    <IconCode size={13} className="shrink-0 text-muted" />
                    <span className="truncate font-mono text-[12px] text-muted">
                      {detailProject.github_repo}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {detailProject.vercel_url && (
                    <a
                      href={detailProject.vercel_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 text-sm font-medium text-on-surface transition-all hover:bg-[var(--surface-2)]"
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

                {/* Members */}
                <div className="border-t border-[var(--border-1)] pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <IconUsers size={14} className="text-muted" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Participantes {detailMembers.length > 0 && `(${detailMembers.length})`}
                    </p>
                  </div>
                  {detailMembers.length === 0 ? (
                    <p className="text-[13px] text-muted">Sin participantes aún.</p>
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
                            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: scopeColor(m.scope) }}>
                              {scopeLabel(m.scope)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                              m.status === "active"
                                ? "border border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                                : m.status === "revoked"
                                ? "border border-[var(--border-1)] text-muted"
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

      {/* Invite modal */}
      <InviteModal
        project={inviteProject}
        open={inviteProject !== null}
        onClose={() => setInviteProject(null)}
        onMembersChange={handleMembersChange}
      />
    </>
  );
}
