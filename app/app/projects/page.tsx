"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconChevD,
  IconExtLink,
  IconGithub,
  IconLayout,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsers,
  IconX,
} from "@/components/brand/VFIcons";
import { InviteShare } from "@/components/live/InviteShare";
import { RepositoryGroupManager } from "@/components/projects/RepositoryGroupManager";
import type { ProjectRepository } from "@/lib/projects/repository-groups";

/* ───────────────────────── tipos ───────────────────────── */

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
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  client_name?: string | null;
  due_date?: string | null;
  contract_amount?: number | null;
  paid_amount?: number | null;
  last_push?: string | null;
  notes_count?: number;
  last_note?: { body: string; created_at: string } | null;
}

interface Note {
  id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

type Activity = "all" | "7" | "30" | "90" | "dormant" | "never";
type Due = "all" | "overdue" | "week" | "month" | "dated" | "undated";
type Progress = "all" | "0" | "low" | "high" | "done";
type Sort =
  | "smart"
  | "activity"
  | "due"
  | "progress"
  | "owed"
  | "contract"
  | "paid"
  | "created"
  | "updated"
  | "notes"
  | "repos"
  | "priority"
  | "name";
type Dir = "desc" | "asc";
type Flag =
  | "priority"
  | "domain"
  | "nodomain"
  | "repo"
  | "norepo"
  | "vercel"
  | "notes"
  | "family"
  | "owed";

interface Filters {
  q: string;
  cats: string[];
  activity: Activity;
  due: Due;
  progress: Progress;
  flags: Flag[];
  client: string;
  lang: string;
  sort: Sort;
  dir: Dir;
  sort2: Sort | "";
  dir2: Dir;
}

const EMPTY: Filters = {
  q: "",
  cats: [],
  activity: "all",
  due: "all",
  progress: "all",
  flags: [],
  client: "",
  lang: "",
  sort: "smart",
  dir: "desc",
  sort2: "",
  dir2: "desc",
};

/* ───────────────────────── constantes ───────────────────────── */

const CATEGORIES: { id: string; label: string }[] = [
  { id: "produccion", label: "Producción" },
  { id: "activo", label: "Activo" },
  { id: "en_revision", label: "En revisión" },
  { id: "en_pausa", label: "En pausa" },
  { id: "archivo", label: "Archivado" },
  { id: "pendiente_borrado", label: "Por borrar" },
];
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

const FLAGS: { id: Flag; label: string }[] = [
  { id: "priority", label: "Prioridad" },
  { id: "owed", label: "Por cobrar" },
  { id: "notes", label: "Con comentarios" },
  { id: "domain", label: "Con dominio" },
  { id: "nodomain", label: "Sin dominio" },
  { id: "repo", label: "Con repo" },
  { id: "norepo", label: "Sin repo" },
  { id: "vercel", label: "En Vercel" },
  { id: "family", label: "Familia / duplicados" },
];

const ACTIVITY: { id: Activity; label: string }[] = [
  { id: "all", label: "Toda" },
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "90", label: "90 días" },
  { id: "dormant", label: "Dormidos +90" },
  { id: "never", label: "Sin push" },
];

const DUE: { id: Due; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "overdue", label: "Vencidas" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "30 días" },
  { id: "dated", label: "Con fecha" },
  { id: "undated", label: "Sin fecha" },
];

const PROGRESS: { id: Progress; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "0", label: "0%" },
  { id: "low", label: "1–49%" },
  { id: "high", label: "50–99%" },
  { id: "done", label: "100%" },
];

/**
 * Criterios de orden. `get` devuelve el valor a comparar (null = sin dato, siempre al final
 * sin importar la dirección); `desc`/`asc` son las etiquetas de cada dirección.
 */
type SortDef = {
  id: Sort;
  label: string;
  def: Dir;
  desc: string;
  asc: string;
  get: (p: Project) => number | string | null;
};
const tsOf = (s: string | null | undefined) => (s ? new Date(s).getTime() : null);
const SORTS: SortDef[] = [
  { id: "smart", label: "Prioridad y estado", def: "desc", desc: "Lo urgente primero", asc: "Lo urgente al final", get: () => 0 },
  {
    id: "activity",
    label: "Actividad (último movimiento)",
    def: "desc",
    desc: "Más reciente primero",
    asc: "Más antiguo primero",
    get: (p) => {
      const a = tsOf(p.last_push);
      const b = tsOf(p.updated_at);
      return a === null && b === null ? null : Math.max(a ?? 0, b ?? 0);
    },
  },
  { id: "due", label: "Fecha de entrega", def: "asc", desc: "Más lejana primero", asc: "Más próxima primero", get: (p) => dueMs(p) },
  { id: "progress", label: "Avance %", def: "desc", desc: "Mayor a menor", asc: "Menor a mayor", get: (p) => p.progress_pct ?? 0 },
  { id: "owed", label: "Por cobrar $", def: "desc", desc: "Mayor a menor", asc: "Menor a mayor", get: (p) => (p.contract_amount ? owed(p) : null) },
  { id: "contract", label: "Monto del contrato $", def: "desc", desc: "Mayor a menor", asc: "Menor a mayor", get: (p) => p.contract_amount ?? null },
  { id: "paid", label: "Cobrado $", def: "desc", desc: "Mayor a menor", asc: "Menor a mayor", get: (p) => p.paid_amount ?? null },
  { id: "notes", label: "Comentarios", def: "desc", desc: "Más a menos", asc: "Menos a más", get: (p) => p.notes_count ?? 0 },
  { id: "repos", label: "Repositorios", def: "desc", desc: "Más a menos", asc: "Menos a más", get: (p) => p.repository_count ?? 0 },
  { id: "priority", label: "Prioridad", def: "desc", desc: "Prioritarios primero", asc: "Prioritarios al final", get: (p) => (p.delivery_priority ? 1 : 0) },
  { id: "created", label: "Fecha de alta", def: "desc", desc: "Más nuevos primero", asc: "Más viejos primero", get: (p) => tsOf(p.created_at) },
  { id: "updated", label: "Último cambio", def: "desc", desc: "Más reciente primero", asc: "Más antiguo primero", get: (p) => tsOf(p.updated_at) },
  { id: "name", label: "Nombre", def: "asc", desc: "Z → A", asc: "A → Z", get: (p) => norm(p.name) },
];
const SORT_BY_ID = Object.fromEntries(SORTS.map((x) => [x.id, x])) as Record<Sort, SortDef>;

// El tema de VForge aplana los -500 de Tailwind: los colores de alerta van en hex.
const C = { rojo: "#dc2626", ambar: "#b45309", verde: "#15803d" };

const DAY = 86_400_000;
const TZ = "America/Cancun";

/* ───────────────────────── utilidades ───────────────────────── */

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
    .replace(/-(demo|v\d+|app|site|admin|preview|front|backend|api|new|old|copy|test)$/g, "")
    .replace(/^-+|-+$/g, "");
}

function norm(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dueMs(p: Project) {
  return p.due_date ? new Date(`${p.due_date}T12:00:00`).getTime() : null;
}

function owed(p: Project) {
  const total = p.contract_amount ?? 0;
  const paid = p.paid_amount ?? 0;
  return Math.max(0, total - paid);
}

function hace(iso: string | null | undefined, now: number) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  const h = Math.round(s / 3600);
  if (h < 48) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 60) return `hace ${d} días`;
  const m = Math.round(d / 30);
  if (m < 24) return `hace ${m} meses`;
  return `hace ${Math.round(m / 12)} años`;
}

function fecha(iso: string | null | undefined, conHora = false) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function dueInfo(p: Project, today: number) {
  const ms = dueMs(p);
  if (ms === null) return null;
  const days = Math.round((ms - today) / DAY);
  const done = (p.progress_pct ?? 0) >= 100 || p.category === "produccion";
  if (done) return { text: `Entrega ${fecha(p.due_date)}`, color: C.verde, days };
  if (days < 0) return { text: `Vencida hace ${-days} d`, color: C.rojo, days };
  if (days === 0) return { text: "Entrega hoy", color: C.rojo, days };
  if (days <= 7) return { text: `Entrega en ${days} d`, color: C.ambar, days };
  return { text: `Entrega ${fecha(p.due_date)}`, color: "", days };
}

/* ── filtros en la URL: se pueden guardar y compartir ── */

function readUrl(): Filters {
  if (typeof window === "undefined") return EMPTY;
  const u = new URLSearchParams(window.location.search);
  const list = (k: string) => (u.get(k) ? u.get(k)!.split(",").filter(Boolean) : []);
  const pick = <T extends string>(k: string, ok: readonly T[], def: T): T => {
    const v = u.get(k) as T | null;
    return v && ok.includes(v) ? v : def;
  };
  return {
    q: u.get("q") ?? "",
    cats: list("estado").filter((c) => CATEGORY_LABELS[c]),
    activity: pick("actividad", ACTIVITY.map((a) => a.id), "all"),
    due: pick("entrega", DUE.map((d) => d.id), "all"),
    progress: pick("avance", PROGRESS.map((p) => p.id), "all"),
    flags: list("marcas").filter((f): f is Flag => FLAGS.some((x) => x.id === f)),
    client: u.get("cliente") ?? "",
    lang: u.get("lenguaje") ?? "",
    sort: pick("orden", SORTS.map((s) => s.id), "smart"),
    dir: pick<Dir>("dir", ["desc", "asc"], "desc"),
    sort2: pick<Sort | "">("orden2", ["", ...SORTS.map((s) => s.id)], ""),
    dir2: pick<Dir>("dir2", ["desc", "asc"], "desc"),
  };
}

function writeUrl(f: Filters) {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.cats.length) u.set("estado", f.cats.join(","));
  if (f.activity !== "all") u.set("actividad", f.activity);
  if (f.due !== "all") u.set("entrega", f.due);
  if (f.progress !== "all") u.set("avance", f.progress);
  if (f.flags.length) u.set("marcas", f.flags.join(","));
  if (f.client) u.set("cliente", f.client);
  if (f.lang) u.set("lenguaje", f.lang);
  if (f.sort !== "smart") u.set("orden", f.sort);
  if (f.dir !== SORT_BY_ID[f.sort].def) u.set("dir", f.dir);
  if (f.sort2) {
    u.set("orden2", f.sort2);
    if (f.dir2 !== SORT_BY_ID[f.sort2].def) u.set("dir2", f.dir2);
  }
  const qs = u.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function activeCount(f: Filters) {
  return (
    (f.q ? 1 : 0) +
    f.cats.length +
    (f.activity !== "all" ? 1 : 0) +
    (f.due !== "all" ? 1 : 0) +
    (f.progress !== "all" ? 1 : 0) +
    f.flags.length +
    (f.client ? 1 : 0) +
    (f.lang ? 1 : 0)
  );
}

/* ───────────────────────── página ───────────────────────── */

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Filters>(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [inviteProject, setInviteProject] = useState<Project | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [repositoryProject, setRepositoryProject] = useState<Project | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const hydrated = useRef(false);

  useEffect(() => {
    setF(readUrl());
    hydrated.current = true;
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (hydrated.current) writeUrl(f);
  }, [f]);

  const upd = useCallback((patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch })), []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
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
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
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
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
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

  const relatedHint = useCallback(
    (p: Project) => {
      const code = p.family_code?.trim().toLowerCase();
      if (code && (familyCounts.get(code) ?? 0) > 1) return `Familia ${code} · ${familyCounts.get(code)}`;
      const root = nameRoot(p.name || p.id);
      if (root && (familyCounts.get(`~${root}`) ?? 0) > 1) return `Posible grupo · ${root}`;
      return null;
    },
    [familyCounts],
  );

  const clients = useMemo(
    () =>
      [...new Set(projects.map((p) => p.client_name?.trim()).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [projects],
  );
  const languages = useMemo(
    () =>
      [...new Set(projects.map((p) => p.github_language).filter(Boolean) as string[])].sort(),
    [projects],
  );

  /** Evalúa todos los filtros menos uno, para contar opciones de ese grupo. */
  const passes = useCallback(
    (p: Project, skip?: keyof Filters | Flag) => {
      const today = todayStart();
      if (skip !== "q" && f.q) {
        const needle = norm(f.q);
        const hay = [
          p.name,
          p.id,
          p.domain,
          p.vercel_url,
          p.github_repo,
          p.family_code,
          p.client_name,
          p.description,
          p.last_note?.body,
          ...(p.repositories ?? []).map((r) => r.repo_full_name),
        ]
          .map(norm)
          .join(" ");
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (skip !== "cats" && f.cats.length && !f.cats.includes(p.category)) return false;
      if (skip !== "client" && f.client && (p.client_name ?? "") !== f.client) return false;
      if (skip !== "lang" && f.lang && (p.github_language ?? "") !== f.lang) return false;

      if (skip !== "activity" && f.activity !== "all") {
        const last = p.last_push ? new Date(p.last_push).getTime() : null;
        const age = last === null ? null : (now - last) / DAY;
        if (f.activity === "never" && last !== null) return false;
        if (f.activity === "dormant" && (age === null || age <= 90)) return false;
        if (["7", "30", "90"].includes(f.activity) && (age === null || age > Number(f.activity)))
          return false;
      }

      if (skip !== "due" && f.due !== "all") {
        const ms = dueMs(p);
        const done = (p.progress_pct ?? 0) >= 100;
        if (f.due === "undated" && ms !== null) return false;
        if (f.due === "dated" && ms === null) return false;
        if (f.due === "overdue" && (ms === null || ms >= today || done)) return false;
        if (f.due === "week" && (ms === null || ms < today || ms > today + 7 * DAY)) return false;
        if (f.due === "month" && (ms === null || ms < today || ms > today + 30 * DAY)) return false;
      }

      if (skip !== "progress" && f.progress !== "all") {
        const v = p.progress_pct ?? 0;
        if (f.progress === "0" && v !== 0) return false;
        if (f.progress === "low" && (v < 1 || v > 49)) return false;
        if (f.progress === "high" && (v < 50 || v > 99)) return false;
        if (f.progress === "done" && v < 100) return false;
      }

      for (const flag of f.flags) {
        if (flag === skip) continue;
        if (flag === "priority" && !p.delivery_priority) return false;
        if (flag === "domain" && !hasDomain(p)) return false;
        if (flag === "nodomain" && hasDomain(p)) return false;
        if (flag === "repo" && !p.github_repo && !(p.repository_count > 0)) return false;
        if (flag === "norepo" && (p.github_repo || p.repository_count > 0)) return false;
        if (flag === "vercel" && !p.vercel_url) return false;
        if (flag === "notes" && !(p.notes_count && p.notes_count > 0)) return false;
        if (flag === "owed" && owed(p) <= 0) return false;
        if (flag === "family" && !relatedHint(p)) return false;
      }
      return true;
    },
    [f, now, relatedHint],
  );

  const filtered = useMemo(() => {
    const list = projects.filter((p) => passes(p));
    const catRank = (c: string) => {
      const i = CATEGORIES.findIndex((x) => x.id === c);
      return i < 0 ? 99 : i;
    };
    const smart = (a: Project, b: Project) =>
      Number(!!b.delivery_priority) - Number(!!a.delivery_priority) ||
      catRank(a.category) - catRank(b.category) ||
      (b.progress_pct ?? 0) - (a.progress_pct ?? 0);
    const by = (id: Sort, dir: Dir) => (a: Project, b: Project) => {
      if (id === "smart") return dir === "desc" ? smart(a, b) : -smart(a, b);
      const def = SORT_BY_ID[id];
      const va = def.get(a);
      const vb = def.get(b);
      // sin dato siempre al final, en cualquier dirección
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const base =
        typeof va === "string" || typeof vb === "string"
          ? String(va).localeCompare(String(vb), "es")
          : (va as number) - (vb as number);
      return dir === "asc" ? base : -base;
    };
    const first = by(f.sort, f.dir);
    const second = f.sort2 ? by(f.sort2, f.dir2) : null;
    return list.sort(
      (a, b) => first(a, b) || (second ? second(a, b) : 0) || a.name.localeCompare(b.name, "es"),
    );
  }, [projects, passes, f.sort, f.dir, f.sort2, f.dir2]);

  /** Tocar un encabezado: mismo criterio invierte la dirección; otro criterio usa su dirección natural. */
  const sortBy = useCallback(
    (id: Sort) =>
      setF((prev) =>
        prev.sort === id
          ? { ...prev, dir: prev.dir === "desc" ? "asc" : "desc" }
          : { ...prev, sort: id, dir: SORT_BY_ID[id].def },
      ),
    [],
  );

  const count = useCallback(
    (skip: keyof Filters | Flag, test: (p: Project) => boolean) =>
      projects.filter((p) => passes(p, skip) && test(p)).length,
    [projects, passes],
  );

  const stats = useMemo(() => {
    const today = todayStart();
    let moved = 0;
    let overdue = 0;
    let soon = 0;
    let money = 0;
    for (const p of filtered) {
      if (p.last_push && now - new Date(p.last_push).getTime() <= 7 * DAY) moved++;
      const ms = dueMs(p);
      const done = (p.progress_pct ?? 0) >= 100;
      if (ms !== null && ms < today && !done) overdue++;
      if (ms !== null && ms >= today && ms <= today + 7 * DAY && !done) soon++;
      money += owed(p);
    }
    return { moved, overdue, soon, money };
  }, [filtered, now]);

  async function patchMeta(projectId: string, patch: Record<string, unknown>) {
    setSavingId(projectId);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("save_failed");
      const data = (await res.json()) as { project: Partial<Project> };
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...data.project } : p)),
      );
    } catch {
      setError("No se pudo guardar el cambio. Reintenta.");
    } finally {
      setSavingId(null);
    }
  }

  function onNotesChanged(projectId: string, notes: Note[]) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              notes_count: notes.length,
              last_note: notes[0] ? { body: notes[0].body, created_at: notes[0].created_at } : null,
            }
          : p,
      ),
    );
  }

  const nActive = activeCount(f);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <header className="border-b border-[var(--border-1)] bg-white px-5 py-3.5 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="mono-label">Control room</p>
            <h1 className="mt-0.5 text-[20px] font-semibold tracking-[-0.03em] text-black md:text-[22px]">
              Proyectos
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void syncProjects()}
            disabled={refreshing}
            className="btn-ghost shrink-0"
          >
            <IconRefresh size={13} className={refreshing ? "animate-spin" : ""} />
            Sincronizar
          </button>
        </div>
      </header>

      {syncMessage ? (
        <div className="border-b border-[var(--border-1)] bg-white px-5 py-3 font-mono text-[10px] uppercase tracking-[0.11em] text-[var(--fg-secondary)] md:px-8">
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

      {/* ── números del filtro actual ── */}
      <section className="grid grid-cols-2 border-b border-[var(--border-1)] bg-white md:grid-cols-5">
        <Stat label="Mostrando" value={`${filtered.length}`} note={`de ${projects.length} proyectos`} />
        <Stat label="Movidos 7 días" value={`${stats.moved}`} note="con push reciente" />
        <Stat
          label="Vencidos"
          value={`${stats.overdue}`}
          note="entrega pasada sin cerrar"
          color={stats.overdue ? C.rojo : undefined}
          onClick={() => upd({ due: f.due === "overdue" ? "all" : "overdue" })}
        />
        <Stat
          label="Entregan en 7 días"
          value={`${stats.soon}`}
          note="por vencer"
          color={stats.soon ? C.ambar : undefined}
          onClick={() => upd({ due: f.due === "week" ? "all" : "week" })}
        />
        <Stat
          label="Por cobrar"
          value={mxn.format(stats.money)}
          note="contrato menos cobrado"
          onClick={() => upd({ flags: toggle(f.flags, "owed" as Flag) })}
          wide
        />
      </section>

      {/* ── barra de búsqueda y filtros ── */}
      <section className="z-10 border-b border-[var(--border-1)] bg-[#f7f7f5]/95 px-5 py-3 backdrop-blur md:sticky md:top-[59px] md:px-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-3">
            <IconSearch size={14} className="shrink-0 text-[var(--fg-muted)]" />
            <span className="sr-only">Buscar proyectos</span>
            <input
              value={f.q}
              onChange={(e) => upd({ q: e.target.value })}
              placeholder="Buscar proyecto, cliente, repo, comentario…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-black placeholder:text-[var(--fg-muted)]"
            />
            {f.q ? (
              <button type="button" onClick={() => upd({ q: "" })} aria-label="Borrar búsqueda">
                <IconX size={14} />
              </button>
            ) : null}
          </label>
          <div className="flex flex-wrap gap-2">
            <SortControl
              label="Ordenar por"
              value={f.sort}
              dir={f.dir}
              onField={(v) => upd({ sort: v as Sort, dir: SORT_BY_ID[v as Sort].def })}
              onDir={() => upd({ dir: f.dir === "desc" ? "asc" : "desc" })}
            />
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={
                nActive
                  ? "inline-flex min-h-11 items-center gap-2 rounded-md border border-black bg-black px-4 text-[13px] text-white"
                  : "inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-4 text-[13px] text-black"
              }
            >
              Filtros{nActive ? ` · ${nActive}` : ""}
              <IconChevD size={14} className={filtersOpen ? "rotate-180 transition" : "transition"} />
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="mt-3 grid gap-4 border-t border-[var(--border-1)] pt-4 lg:grid-cols-2">
            <Group label="Estado">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  active={f.cats.includes(c.id)}
                  label={c.label}
                  n={count("cats", (p) => p.category === c.id)}
                  onClick={() => upd({ cats: toggle(f.cats, c.id) })}
                />
              ))}
            </Group>

            <Group label="Actividad (último push)">
              {ACTIVITY.map((a) => (
                <Chip
                  key={a.id}
                  active={f.activity === a.id}
                  label={a.label}
                  onClick={() => upd({ activity: a.id })}
                />
              ))}
            </Group>

            <Group label="Entrega">
              {DUE.map((d) => (
                <Chip key={d.id} active={f.due === d.id} label={d.label} onClick={() => upd({ due: d.id })} />
              ))}
            </Group>

            <Group label="Avance">
              {PROGRESS.map((p) => (
                <Chip
                  key={p.id}
                  active={f.progress === p.id}
                  label={p.label}
                  onClick={() => upd({ progress: p.id })}
                />
              ))}
            </Group>

            <Group label="Marcas" wide>
              {FLAGS.map((fl) => (
                <Chip
                  key={fl.id}
                  active={f.flags.includes(fl.id)}
                  label={fl.label}
                  n={count(fl.id, (p) => {
                    if (fl.id === "priority") return !!p.delivery_priority;
                    if (fl.id === "domain") return hasDomain(p);
                    if (fl.id === "nodomain") return !hasDomain(p);
                    if (fl.id === "repo") return !!p.github_repo || p.repository_count > 0;
                    if (fl.id === "norepo") return !p.github_repo && !(p.repository_count > 0);
                    if (fl.id === "vercel") return !!p.vercel_url;
                    if (fl.id === "notes") return (p.notes_count ?? 0) > 0;
                    if (fl.id === "owed") return owed(p) > 0;
                    return !!relatedHint(p);
                  })}
                  onClick={() => upd({ flags: toggle(f.flags, fl.id) })}
                />
              ))}
            </Group>

            <div className="lg:col-span-2">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                Si empatan, luego por
              </p>
              <SortControl
                label="Luego por"
                value={f.sort2}
                dir={f.dir2}
                allowNone
                onField={(v) =>
                  upd(v ? { sort2: v as Sort, dir2: SORT_BY_ID[v as Sort].def } : { sort2: "" })
                }
                onDir={() => upd({ dir2: f.dir2 === "desc" ? "asc" : "desc" })}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
              <SelectBox
                label="Cliente"
                value={f.client}
                onChange={(v) => upd({ client: v })}
                options={clients}
                empty={clients.length ? "Todos los clientes" : "Aún no hay clientes capturados"}
              />
              <SelectBox
                label="Lenguaje"
                value={f.lang}
                onChange={(v) => upd({ lang: v })}
                options={languages}
                empty="Todos los lenguajes"
              />
            </div>
          </div>
        ) : null}

        {nActive ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {activePills(f, upd, toggle).map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={pill.clear}
                className="inline-flex items-center gap-1 rounded-full border border-black bg-white px-2.5 py-1 text-[12px] text-black"
              >
                {pill.label}
                <IconX size={11} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setF({ ...EMPTY, sort: f.sort, dir: f.dir, sort2: f.sort2, dir2: f.dir2 })}
              className="px-2 py-1 text-[12px] underline underline-offset-4"
            >
              Limpiar todo
            </button>
          </div>
        ) : null}
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
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_140px_150px_auto] gap-4 border-b border-[var(--border-1)] px-8 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)] lg:grid">
          <HeadSort id="name" label="Proyecto" f={f} onSort={sortBy} />
          <HeadSort id="repos" label="Origen" f={f} onSort={sortBy} />
          <HeadSort id="activity" label="Actividad" f={f} onSort={sortBy} />
          <span className="flex gap-3">
            <HeadSort id="due" label="Entrega" f={f} onSort={sortBy} />
            <HeadSort id="progress" label="Avance" f={f} onSort={sortBy} />
          </span>
          <span className="text-right">Acciones</span>
        </div>

        {loading ? (
          <ProjectSkeleton />
        ) : filtered.length === 0 && !error ? (
          <div className="px-5 py-20 text-center md:px-8">
            <IconLayout size={20} className="mx-auto" />
            <p className="mt-4 text-[14px] font-medium text-black">
              {projects.length === 0
                ? "No hay proyectos disponibles para esta cuenta."
                : "Ningún proyecto coincide con estos filtros."}
            </p>
            {nActive ? (
              <button
                type="button"
                onClick={() => setF({ ...EMPTY, sort: f.sort, dir: f.dir, sort2: f.sort2, dir2: f.dir2 })}
                className="mt-3 text-[13px] underline underline-offset-4"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-1)]">
            {filtered.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                now={now}
                open={openId === project.id}
                saving={savingId === project.id}
                relatedHint={relatedHint(project)}
                onToggle={() => setOpenId((v) => (v === project.id ? null : project.id))}
                onInvite={() => setInviteProject(project)}
                onRepositories={() => setRepositoryProject(project)}
                onPatch={(patch) => void patchMeta(project.id, patch)}
                onNotesChanged={(notes) => onNotesChanged(project.id, notes)}
                onClient={(c) => {
                  upd({ client: c });
                  setFiltersOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function activePills(
  f: Filters,
  upd: (p: Partial<Filters>) => void,
  toggle: <T>(arr: T[], v: T) => T[],
) {
  const out: { key: string; label: string; clear: () => void }[] = [];
  if (f.q) out.push({ key: "q", label: `“${f.q}”`, clear: () => upd({ q: "" }) });
  for (const c of f.cats)
    out.push({ key: `c-${c}`, label: CATEGORY_LABELS[c] ?? c, clear: () => upd({ cats: toggle(f.cats, c) }) });
  if (f.activity !== "all")
    out.push({
      key: "a",
      label: `Actividad: ${ACTIVITY.find((a) => a.id === f.activity)?.label}`,
      clear: () => upd({ activity: "all" }),
    });
  if (f.due !== "all")
    out.push({
      key: "d",
      label: `Entrega: ${DUE.find((d) => d.id === f.due)?.label}`,
      clear: () => upd({ due: "all" }),
    });
  if (f.progress !== "all")
    out.push({
      key: "p",
      label: `Avance: ${PROGRESS.find((p) => p.id === f.progress)?.label}`,
      clear: () => upd({ progress: "all" }),
    });
  for (const fl of f.flags)
    out.push({
      key: `f-${fl}`,
      label: FLAGS.find((x) => x.id === fl)?.label ?? fl,
      clear: () => upd({ flags: toggle(f.flags, fl) }),
    });
  if (f.client) out.push({ key: "cl", label: `Cliente: ${f.client}`, clear: () => upd({ client: "" }) });
  if (f.lang) out.push({ key: "l", label: f.lang, clear: () => upd({ lang: "" }) });
  return out;
}

/* ───────────────────────── piezas ───────────────────────── */

function Stat({
  label,
  value,
  note,
  color,
  onClick,
  wide,
}: {
  label: string;
  value: string;
  note: string;
  color?: string;
  onClick?: () => void;
  wide?: boolean;
}) {
  const inner = (
    <>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
      <p
        className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-black md:text-[26px]"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-[var(--fg-tertiary)]">{note}</p>
    </>
  );
  const cls = `border-b border-r border-[var(--border-1)] px-4 py-3 text-left md:border-b-0 md:px-6 md:py-4 ${
    wide ? "col-span-2 md:col-span-1" : ""
  }`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition hover:bg-[#fafaf8]`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Group({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "lg:col-span-2" : undefined}>
      <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  label,
  n,
  onClick,
}: {
  active: boolean;
  label: string;
  n?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-black bg-black px-3 text-[13px] text-white"
          : "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border-1)] bg-white px-3 text-[13px] text-black hover:border-black"
      }
    >
      {label}
      {n !== undefined ? (
        <span className={active ? "tabular-nums text-white/70" : "tabular-nums text-[var(--fg-muted)]"}>{n}</span>
      ) : null}
    </button>
  );
}

function SortControl({
  label,
  value,
  dir,
  onField,
  onDir,
  allowNone,
}: {
  label: string;
  value: Sort | "";
  dir: Dir;
  onField: (v: string) => void;
  onDir: () => void;
  allowNone?: boolean;
}) {
  const def = value ? SORT_BY_ID[value] : null;
  return (
    <div className="flex min-h-11 flex-1 items-stretch overflow-hidden rounded-md border border-[var(--border-1)] bg-white text-[13px] md:flex-none">
      <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <span className="whitespace-nowrap text-[var(--fg-muted)]">{label}</span>
        <select
          value={value}
          onChange={(e) => onField(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-black"
        >
          {allowNone ? <option value="">Nada</option> : null}
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {def ? (
        <button
          type="button"
          onClick={onDir}
          title="Cambiar dirección"
          aria-label={`Dirección: ${dir === "desc" ? def.desc : def.asc}. Tocar para invertir`}
          className="flex items-center gap-1.5 whitespace-nowrap border-l border-[var(--border-1)] px-3 text-black hover:bg-[#f7f7f5]"
        >
          <span aria-hidden className="text-[15px] leading-none">{dir === "desc" ? "↓" : "↑"}</span>
          {dir === "desc" ? def.desc : def.asc}
        </button>
      ) : null}
    </div>
  );
}

function HeadSort({
  id,
  label,
  f,
  onSort,
}: {
  id: Sort;
  label: string;
  f: Filters;
  onSort: (id: Sort) => void;
}) {
  const on = f.sort === id;
  return (
    <button
      type="button"
      onClick={() => onSort(id)}
      className={`inline-flex items-center gap-1 text-left uppercase tracking-[0.16em] hover:text-black ${on ? "text-black" : ""}`}
      title={`Ordenar por ${label.toLowerCase()}`}
    >
      {label}
      <span aria-hidden>{on ? (f.dir === "desc" ? "↓" : "↑") : "↕"}</span>
    </button>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  options,
  empty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  empty: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-3 text-[13px]">
      <span className="whitespace-nowrap text-[var(--fg-muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-black"
      >
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectRow({
  project: p,
  now,
  open,
  saving,
  relatedHint,
  onToggle,
  onInvite,
  onRepositories,
  onPatch,
  onNotesChanged,
  onClient,
}: {
  project: Project;
  now: number;
  open: boolean;
  saving: boolean;
  relatedHint: string | null;
  onToggle: () => void;
  onInvite: () => void;
  onRepositories: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onNotesChanged: (notes: Note[]) => void;
  onClient: (c: string) => void;
}) {
  const externalUrl = normalizeExternalUrl(p.domain || p.vercel_url);
  const active = p.category === "produccion" || p.category === "activo" || p.category === "en_revision";
  const pct = Math.max(0, Math.min(100, p.progress_pct ?? 0));
  const due = dueInfo(p, todayStart());
  const debe = owed(p);
  const lastMove = p.last_push ?? null;

  return (
    <article className={open ? "bg-[#fafaf8]" : undefined}>
      <div className="grid gap-4 px-5 py-5 transition hover:bg-[#fafaf8] lg:grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_140px_150px_auto] lg:items-start lg:px-8">
        {/* proyecto */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-shape shrink-0" data-active={active} />
            <button
              type="button"
              onClick={onToggle}
              className="truncate text-left text-[15px] font-medium tracking-[-0.02em] hover:underline"
            >
              {p.name}
            </button>
            {p.delivery_priority ? (
              <span className="rounded-full border border-black px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]">
                Prioridad
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--border-1)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-secondary)]">
              {CATEGORY_LABELS[p.category] ?? p.category}
            </span>
          </div>
          <p className="mt-1 truncate pl-[15px] text-[12px] text-[var(--fg-tertiary)]">
            {p.client_name ? (
              <button
                type="button"
                onClick={() => onClient(p.client_name!)}
                className="font-medium text-black hover:underline"
              >
                {p.client_name}
              </button>
            ) : (
              <span className="italic">Sin cliente</span>
            )}
            <span className="font-mono"> · {p.id}</span>
            {relatedHint ? <span> · {relatedHint}</span> : null}
          </p>
          {p.description ? (
            <p className="mt-1 line-clamp-2 pl-[15px] text-[13px] leading-5 text-[var(--fg-secondary)]">
              {p.description}
            </p>
          ) : null}
          {p.last_note ? (
            <button
              type="button"
              onClick={onToggle}
              className="mt-2 ml-[15px] block max-w-full rounded-md border-l-2 border-black bg-white px-2.5 py-1.5 text-left text-[12px] leading-5 text-[var(--fg-secondary)]"
            >
              <span className="line-clamp-2">“{p.last_note.body}”</span>
              <span className="mt-0.5 block font-mono text-[10px] text-[var(--fg-muted)]">
                {hace(p.last_note.created_at, now)} · {p.notes_count} comentario
                {p.notes_count === 1 ? "" : "s"}
              </span>
            </button>
          ) : null}
        </div>

        {/* origen */}
        <div className="min-w-0 text-[12px]">
          {p.github_repo ? (
            <span className="inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] text-[var(--fg-secondary)]">
              <IconGithub size={12} className="shrink-0" />
              <span className="truncate">{p.github_repo}</span>
            </span>
          ) : (
            <span className="font-mono text-[11px] text-[var(--fg-muted)]">Sin repositorio</span>
          )}
          {p.domain || p.vercel_url ? (
            <p className="mt-1 truncate font-mono text-[11px] text-[var(--fg-muted)]">{p.domain ?? p.vercel_url}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
            {[p.github_language, (p.repository_count ?? 0) > 1 ? `${p.repository_count} repos` : null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>

        {/* actividad */}
        <div className="text-[12px]">
          <p className="font-medium text-black">{lastMove ? hace(lastMove, now) : "Sin push"}</p>
          <p className="text-[11px] text-[var(--fg-muted)]">último push</p>
          <p className="mt-1.5 text-[11px] text-[var(--fg-muted)]">Alta {fecha(p.created_at)}</p>
        </div>

        {/* entrega y avance */}
        <div className="text-[12px]">
          {due ? (
            <p className="font-medium" style={due.color ? { color: due.color } : undefined}>
              {due.text}
            </p>
          ) : (
            <p className="text-[var(--fg-muted)]">Sin fecha de entrega</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-black/10">
              <div className="h-full bg-black" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[11px] tabular-nums">{pct}%</span>
          </div>
          {p.contract_amount ? (
            <p className="mt-1.5 text-[11px] text-[var(--fg-secondary)]">
              {mxn.format(p.contract_amount)}
              {debe > 0 ? (
                <span style={{ color: C.ambar }}> · debe {mxn.format(debe)}</span>
              ) : (
                <span style={{ color: C.verde }}> · pagado</span>
              )}
            </p>
          ) : null}
        </div>

        {/* acciones */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className={open ? "btn-primary !min-h-9 !px-3" : "btn-ghost !min-h-9 !px-3"}
          >
            Detalle
            <IconChevD size={12} className={open ? "rotate-180 transition" : "transition"} />
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onPatch({ delivery_priority: !p.delivery_priority })}
            className="btn-ghost !min-h-9 !px-3"
            title={p.delivery_priority ? "Quitar prioridad" : "Marcar como prioridad"}
          >
            {p.delivery_priority ? "★" : "☆"}
          </button>
          <button type="button" onClick={onRepositories} className="btn-ghost !min-h-9 !px-3" title="Agrupar repositorios">
            <IconGithub size={12} />
            <span className="hidden xl:inline">{p.repository_count ?? p.repositories?.length ?? 0}</span>
          </button>
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !min-h-9 !px-3"
              aria-label={`Abrir ${p.name}`}
            >
              <IconExtLink size={12} />
            </a>
          ) : null}
          <button type="button" onClick={onInvite} className="btn-ghost !min-h-9 !px-3" title="Invitar por WhatsApp">
            <IconUsers size={12} />
          </button>
          <Link href={`/app/live/${encodeURIComponent(p.id)}`} className="btn-primary !min-h-9 !px-4">
            <IconLayout size={12} /> Sala
          </Link>
        </div>
      </div>

      {open ? (
        <Detail project={p} now={now} saving={saving} onPatch={onPatch} onNotesChanged={onNotesChanged} />
      ) : null}
    </article>
  );
}

function Detail({
  project: p,
  now,
  saving,
  onPatch,
  onNotesChanged,
}: {
  project: Project;
  now: number;
  saving: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  onNotesChanged: (notes: Note[]) => void;
}) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pct, setPct] = useState(p.progress_pct ?? 0);

  useEffect(() => setPct(p.progress_pct ?? 0), [p.progress_pct]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/${encodeURIComponent(p.id)}/notes`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { notes: Note[] }) => alive && setNotes(d.notes))
      .catch(() => alive && setNoteError("No se pudieron cargar los comentarios."));
    return () => {
      alive = false;
    };
  }, [p.id]);

  async function addNote() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setNoteError(null);
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(p.id)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { note: Note };
      const next = [d.note, ...(notes ?? [])];
      setNotes(next);
      onNotesChanged(next);
      setDraft("");
    } catch {
      setNoteError("No se guardó el comentario. Reintenta.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNote(id: string) {
    if (!window.confirm("¿Borrar este comentario?")) return;
    const r = await fetch(`/api/projects/${encodeURIComponent(p.id)}/notes?note=${id}`, { method: "DELETE" });
    if (!r.ok) {
      setNoteError("No se pudo borrar.");
      return;
    }
    const next = (notes ?? []).filter((n) => n.id !== id);
    setNotes(next);
    onNotesChanged(next);
  }

  const field =
    "mt-1 w-full rounded-md border border-[var(--border-1)] bg-white px-3 py-2 text-[14px] text-black disabled:opacity-60";
  const label = "font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]";

  return (
    <div className="grid gap-6 border-t border-[var(--border-1)] px-5 pb-6 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
      {/* datos editables */}
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Estado</span>
          <select
            className={field}
            value={p.category}
            disabled={saving}
            onChange={(e) => onPatch({ category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Cliente</span>
          <input
            className={field}
            defaultValue={p.client_name ?? ""}
            disabled={saving}
            placeholder="Nombre del cliente"
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if ((p.client_name ?? null) !== v) onPatch({ client_name: v });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <label className="block">
          <span className={label}>Fecha de entrega</span>
          <input
            type="date"
            className={field}
            defaultValue={p.due_date ?? ""}
            disabled={saving}
            onChange={(e) => {
              const v = e.target.value || null;
              if ((p.due_date ?? null) !== v) onPatch({ due_date: v });
            }}
          />
        </label>
        <label className="block">
          <span className={label}>Avance · {pct}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            disabled={saving}
            onChange={(e) => setPct(Number(e.target.value))}
            onMouseUp={() => pct !== (p.progress_pct ?? 0) && onPatch({ progress_pct: pct })}
            onTouchEnd={() => pct !== (p.progress_pct ?? 0) && onPatch({ progress_pct: pct })}
            onKeyUp={() => pct !== (p.progress_pct ?? 0) && onPatch({ progress_pct: pct })}
            className="mt-3 w-full"
            aria-label="Porcentaje de avance"
          />
        </label>
        <label className="block">
          <span className={label}>Monto del contrato (MXN)</span>
          <input
            inputMode="decimal"
            className={field}
            defaultValue={p.contract_amount ?? ""}
            disabled={saving}
            placeholder="0"
            onBlur={(e) => {
              const v = e.target.value.trim();
              const n = v === "" ? null : Number(v.replace(/[$,\s]/g, ""));
              if ((p.contract_amount ?? null) !== n) onPatch({ contract_amount: v === "" ? null : v });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <label className="block">
          <span className={label}>Cobrado (MXN)</span>
          <input
            inputMode="decimal"
            className={field}
            defaultValue={p.paid_amount ?? ""}
            disabled={saving}
            placeholder="0"
            onBlur={(e) => {
              const v = e.target.value.trim();
              const n = v === "" ? null : Number(v.replace(/[$,\s]/g, ""));
              if ((p.paid_amount ?? null) !== n) onPatch({ paid_amount: v === "" ? null : v });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <label className="block">
          <span className={label}>Código de familia</span>
          <input
            className={`${field} font-mono`}
            defaultValue={p.family_code ?? ""}
            disabled={saving}
            placeholder="ej. vliving"
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if ((p.family_code ?? null) !== v) onPatch({ family_code: v });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <div className="text-[12px] text-[var(--fg-tertiary)]">
          <span className={label}>Fechas</span>
          <p className="mt-2">Alta: {fecha(p.created_at)}</p>
          <p>Último cambio: {fecha(p.updated_at, true)}</p>
          <p>Último push: {p.last_push ? fecha(p.last_push, true) : "—"}</p>
        </div>
        <label className="block sm:col-span-2">
          <span className={label}>Descripción</span>
          <textarea
            className={`${field} min-h-[72px] resize-y`}
            defaultValue={p.description ?? ""}
            disabled={saving}
            placeholder="Qué es, para quién y en qué va"
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if ((p.description ?? null) !== v) onPatch({ description: v });
            }}
          />
        </label>
        {saving ? <p className="text-[12px] text-[var(--fg-muted)] sm:col-span-2">Guardando…</p> : null}
      </div>

      {/* comentarios */}
      <div className="min-w-0">
        <p className={label}>Comentarios{notes ? ` · ${notes.length}` : ""}</p>
        <div className="mt-2 rounded-md border border-[var(--border-1)] bg-white p-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void addNote();
            }}
            placeholder="Escribe un avance, acuerdo o pendiente…"
            className="min-h-[64px] w-full resize-y bg-transparent px-1 py-1 text-[14px] text-black placeholder:text-[var(--fg-muted)]"
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-[var(--fg-muted)]">Ctrl + Enter para guardar</span>
            <button
              type="button"
              onClick={() => void addNote()}
              disabled={!draft.trim() || busy}
              className="btn-primary !min-h-9 !px-4 disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
        {noteError ? <p className="mt-2 text-[12px]" style={{ color: C.rojo }}>{noteError}</p> : null}
        <ul className="mt-3 flex flex-col gap-2">
          {notes === null && !noteError ? (
            <li className="h-12 animate-pulse rounded-md bg-black/5" />
          ) : null}
          {notes?.length === 0 ? (
            <li className="text-[13px] text-[var(--fg-muted)]">Todavía no hay comentarios.</li>
          ) : null}
          {notes?.map((n) => (
            <li key={n.id} className="group rounded-md border border-[var(--border-1)] bg-white px-3 py-2">
              <p className="whitespace-pre-wrap text-[13px] leading-5 text-black">{n.body}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--fg-muted)]">
                  {fecha(n.created_at, true)} · {hace(n.created_at, now)}
                  {n.author_email ? ` · ${n.author_email.split("@")[0]}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void removeNote(n.id)}
                  className="rounded p-1 text-[var(--fg-muted)] hover:text-black"
                  aria-label="Borrar comentario"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="divide-y divide-[var(--border-1)]" aria-label="Cargando proyectos">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="grid animate-pulse gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_140px_150px_auto] lg:px-8"
        >
          <div className="h-4 w-1/2 rounded bg-black/10" />
          <div className="h-4 w-2/3 rounded bg-black/10" />
          <div className="h-4 w-16 rounded bg-black/10" />
          <div className="h-4 w-20 rounded bg-black/10" />
          <div className="h-9 w-28 rounded bg-black/10 lg:justify-self-end" />
        </div>
      ))}
    </div>
  );
}
