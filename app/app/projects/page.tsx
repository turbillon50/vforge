"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconChevD,
  IconGithub,
  IconLayout,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/brand/VFIcons";
import { InviteShare } from "@/components/live/InviteShare";
import { RepositoryGroupManager } from "@/components/projects/RepositoryGroupManager";
import { BulkBar, type CambioLote } from "@/components/projects/BulkBar";
import { FamilyRow } from "@/components/projects/FamilyRow";
import { SuggestionsPanel, type SugerenciaLista } from "@/components/projects/SuggestionsPanel";
import { agruparFamilias, mapaFamilias, type Familia } from "@/lib/projects/familias";
import { estadoReal } from "@/lib/projects/estado-real";
import {
  CATEGORIAS_UI,
  ETIQUETA_CATEGORIA,
  MXN,
  fecha,
  hace,
  porCobrar,
  valorSugerido,
  type ProyectoVista,
} from "@/lib/projects/vista";

/* ───────────────────────── tipos ───────────────────────── */

type Project = ProyectoVista;

interface Note {
  id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

type Activity = "all" | "7" | "30" | "90" | "dormant" | "never";
type Due = "all" | "overdue" | "week" | "month" | "dated" | "undated";
type Progress = "all" | "0" | "low" | "high" | "done";
/** De dónde viene el estado: lo puso Luis o lo calculó la máquina. */
type Fuente = "all" | "manual" | "calculado";
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
  | "sugerencias"
  | "owed";

interface Filters {
  q: string;
  cats: string[];
  activity: Activity;
  due: Due;
  progress: Progress;
  fuente: Fuente;
  flags: Flag[];
  client: string;
  lang: string;
  sort: Sort;
  dir: Dir;
  sort2: Sort | "";
  dir2: Dir;
  /** Vista: una fila por familia (así no se ve la misma app 14 veces). */
  agrupar: boolean;
}

const EMPTY: Filters = {
  q: "",
  cats: [],
  activity: "all",
  due: "all",
  progress: "all",
  fuente: "all",
  flags: [],
  client: "",
  lang: "",
  sort: "smart",
  dir: "desc",
  sort2: "",
  dir2: "desc",
  agrupar: true,
};

/* ───────────────────────── constantes ───────────────────────── */

const CATEGORIES = CATEGORIAS_UI;
const CATEGORY_LABELS = ETIQUETA_CATEGORIA;

const FLAGS: { id: Flag; label: string }[] = [
  { id: "priority", label: "Prioridad" },
  { id: "owed", label: "Por cobrar" },
  { id: "notes", label: "Con comentarios" },
  { id: "sugerencias", label: "Con sugerencias" },
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

const FUENTES: { id: Fuente; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "manual", label: "Puesto a mano" },
  { id: "calculado", label: "Calculado" },
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

/** Filas por tanda (familias o proyectos). Cada fila es un componente pesado. */
const PAGINA = 40;

// El tema de VForge aplana los -500 de Tailwind: los colores de alerta van en hex.
const C = { rojo: "#dc2626", ambar: "#b45309", verde: "#15803d" };

const DAY = 86_400_000;

/* ───────────────────────── utilidades ───────────────────────── */

const mxn = MXN;
const owed = porCobrar;

function hasDomain(p: Project) {
  return Boolean(p.domain?.trim());
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

/** Recalcula el estado real con el MISMO módulo del servidor tras guardar. */
function conEstado(p: Project): Project {
  const e = estadoReal({
    category: p.category,
    category_manual_at: p.category_manual_at,
    domain: p.domain,
    vercel_url: p.vercel_url,
    vercel_project_id: p.vercel_project_id,
    deploys_ready: p.deploys_ready,
    health_status: p.health_status,
    health_ok: p.health_ok,
    health_checked_at: p.health_checked_at,
    last_push: p.last_push,
    github_repo: p.github_repo,
    repository_count: p.repository_count,
  });
  return {
    ...p,
    estado_real: e.estado,
    estado_fuente: e.fuente,
    estado_motivo: e.motivo,
    sondeo_pendiente: e.sondeo_pendiente,
  };
}

function dueInfo(p: Project, today: number) {
  const ms = dueMs(p);
  if (ms === null) return null;
  const days = Math.round((ms - today) / DAY);
  const done = (p.progress_pct ?? 0) >= 100 || p.estado_real === "produccion";
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
    fuente: pick("fuente", FUENTES.map((x) => x.id), "all"),
    flags: list("marcas").filter((f): f is Flag => FLAGS.some((x) => x.id === f)),
    client: u.get("cliente") ?? "",
    lang: u.get("lenguaje") ?? "",
    sort: pick("orden", SORTS.map((s) => s.id), "smart"),
    dir: pick<Dir>("dir", ["desc", "asc"], "desc"),
    sort2: pick<Sort | "">("orden2", ["", ...SORTS.map((s) => s.id)], ""),
    dir2: pick<Dir>("dir2", ["desc", "asc"], "desc"),
    agrupar: u.get("agrupar") !== "0",
  };
}

function writeUrl(f: Filters) {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.cats.length) u.set("estado", f.cats.join(","));
  if (f.activity !== "all") u.set("actividad", f.activity);
  if (f.due !== "all") u.set("entrega", f.due);
  if (f.progress !== "all") u.set("avance", f.progress);
  if (f.fuente !== "all") u.set("fuente", f.fuente);
  if (f.flags.length) u.set("marcas", f.flags.join(","));
  if (f.client) u.set("cliente", f.client);
  if (f.lang) u.set("lenguaje", f.lang);
  if (f.sort !== "smart") u.set("orden", f.sort);
  if (f.dir !== SORT_BY_ID[f.sort].def) u.set("dir", f.dir);
  if (f.sort2) {
    u.set("orden2", f.sort2);
    if (f.dir2 !== SORT_BY_ID[f.sort2].def) u.set("dir2", f.dir2);
  }
  if (!f.agrupar) u.set("agrupar", "0");
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
    (f.fuente !== "all" ? 1 : 0) +
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
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(new Set());
  const [inviteProject, setInviteProject] = useState<Project | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [repositoryProject, setRepositoryProject] = useState<Project | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pagina, setPagina] = useState(1);
  // Estado real: cuántos dominios faltan por sondear y el sondeo en curso.
  const [sinSondear, setSinSondear] = useState(0);
  const [sondeando, setSondeando] = useState(false);
  // Sugerencias con fuente.
  const [sugerencias, setSugerencias] = useState<SugerenciaLista[]>([]);
  const [panelSugerencias, setPanelSugerencias] = useState(false);
  const [sugOcupado, setSugOcupado] = useState(false);
  const [sugAviso, setSugAviso] = useState<string | null>(null);
  // Edición masiva.
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [loteOcupado, setLoteOcupado] = useState(false);
  const [loteAviso, setLoteAviso] = useState<string | null>(null);
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
      const payload = (await response.json()) as {
        projects?: Project[];
        sin_sondear?: number;
      };
      setProjects(Array.isArray(payload.projects) ? payload.projects : []);
      setSinSondear(payload.sin_sondear ?? 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSugerencias = useCallback(async () => {
    try {
      const r = await fetch("/api/projects/suggestions", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { sugerencias?: SugerenciaLista[] };
      setSugerencias(d.sugerencias ?? []);
    } catch {
      // Las sugerencias son ayuda, no el catálogo: si fallan, la lista sigue.
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

  /** Sondea los dominios por tandas hasta que no queden pendientes. */
  const sondearDominios = useCallback(async () => {
    setSondeando(true);
    setError(null);
    let vivos = 0;
    let medidos = 0;
    try {
      for (let vuelta = 0; vuelta < 20; vuelta++) {
        const r = await fetch("/api/projects/health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limite: 30 }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as { sondeados: number; vivos: number; restantes: number };
        medidos += d.sondeados;
        vivos += d.vivos;
        setSinSondear(d.restantes);
        setSyncMessage(
          `Sondeando dominios: ${medidos} medidos · ${vivos} responden · ${d.restantes} por medir`,
        );
        if (d.restantes === 0 || d.sondeados === 0) break;
      }
      await loadProjects();
      setSyncMessage(`Sondeo listo: ${medidos} dominios medidos, ${vivos} responden`);
    } catch (caught) {
      setSyncMessage(null);
      setError(
        `No se pudo sondear los dominios: ${caught instanceof Error ? caught.message : "error"}`,
      );
    } finally {
      setSondeando(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    void loadProjects();
    void loadSugerencias();
  }, [loadProjects, loadSugerencias]);

  /** Familias de TODO el catálogo: sirven para la pastilla y para el filtro. */
  const familiasCatalogo = useMemo(() => mapaFamilias(projects), [projects]);

  const relatedHint = useCallback(
    (p: Project) => {
      const fam = familiasCatalogo.get(p.id);
      if (!fam?.agrupada) return null;
      return `Familia ${fam.etiqueta} · ${fam.miembros.length}`;
    },
    [familiasCatalogo],
  );

  const sugerenciasPorProyecto = useMemo(() => {
    const m = new Map<string, SugerenciaLista[]>();
    for (const s of sugerencias) m.set(s.project_id, [...(m.get(s.project_id) ?? []), s]);
    return m;
  }, [sugerencias]);

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
      // El filtro de estado usa el estado REAL: manual si existe, calculado si no.
      if (skip !== "cats" && f.cats.length && !f.cats.includes(p.estado_real)) return false;
      if (skip !== "fuente" && f.fuente !== "all" && p.estado_fuente !== f.fuente) return false;
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
        if (flag === "sugerencias" && !sugerenciasPorProyecto.has(p.id)) return false;
        if (flag === "family" && !familiasCatalogo.get(p.id)?.agrupada) return false;
      }
      return true;
    },
    [f, now, familiasCatalogo, sugerenciasPorProyecto],
  );

  const filtered = useMemo(() => {
    const list = projects.filter((p) => passes(p));
    const catRank = (c: string) => {
      const i = CATEGORIES.findIndex((x) => x.id === c);
      return i < 0 ? 99 : i;
    };
    const smart = (a: Project, b: Project) =>
      Number(!!b.delivery_priority) - Number(!!a.delivery_priority) ||
      catRank(a.estado_real) - catRank(b.estado_real) ||
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

  /** Vista agrupada: una fila por familia, en el orden que quedó la lista. */
  const familias = useMemo<Familia<Project>[] | null>(
    () => (f.agrupar ? agruparFamilias(filtered) : null),
    [f.agrupar, filtered],
  );
  const agrupadas = familias?.filter((x) => x.agrupada).length ?? 0;

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

  // Al cambiar filtros u orden se vuelve a la primera tanda: si no, el usuario
  // filtra a 3 resultados y sigue con la lista "expandida" de la búsqueda anterior.
  useEffect(() => {
    setPagina(1);
  }, [f]);

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

  const calculados = useMemo(
    () => filtered.filter((p) => p.estado_fuente === "calculado").length,
    [filtered],
  );

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
        prev.map((p) => (p.id === projectId ? conEstado({ ...p, ...data.project }) : p)),
      );
    } catch {
      setError("No se pudo guardar el cambio. Reintenta.");
    } finally {
      setSavingId(null);
    }
  }

  /* ── sugerencias ── */

  async function escanearSugerencias() {
    setSugOcupado(true);
    setSugAviso(null);
    try {
      const r = await fetch("/api/projects/suggestions", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as {
        encontradas: number;
        pendientes: number;
        sin_emparejar: Array<{ fuente: string; referencia: string }>;
        sugerencias: SugerenciaLista[];
      };
      setSugerencias(d.sugerencias ?? []);
      setPanelSugerencias(true);
      setSugAviso(
        `${d.encontradas} con fuente · ${d.pendientes} por confirmar${
          d.sin_emparejar.length
            ? ` · ${d.sin_emparejar.length} fila(s) de la fuente sin proyecto que les corresponda (${d.sin_emparejar
                .map((x) => x.referencia)
                .join(", ")})`
            : ""
        }`,
      );
    } catch (caught) {
      setSugAviso(
        `No se pudo buscar en las fuentes: ${caught instanceof Error ? caught.message : "error"}`,
      );
    } finally {
      setSugOcupado(false);
    }
  }

  async function resolverSugerencias(accion: "confirmar" | "rechazar", ids: string[] | "todas") {
    setSugOcupado(true);
    setSugAviso(null);
    try {
      const r = await fetch("/api/projects/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ids === "todas" ? { accion, todas: true } : { accion, ids },
        ),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as {
        aplicadas: number;
        omitidas: Array<{ id: string; motivo: string }>;
        sugerencias: SugerenciaLista[];
      };
      setSugerencias(d.sugerencias ?? []);
      setSugAviso(
        accion === "confirmar"
          ? `${d.aplicadas} dato(s) capturado(s) desde su fuente${
              d.omitidas.length ? ` · ${d.omitidas.length} omitida(s) porque ya tenían dato` : ""
            }`
          : `${d.aplicadas} sugerencia(s) descartada(s)`,
      );
      await loadProjects();
    } catch (caught) {
      setSugAviso(
        `No se pudo aplicar: ${caught instanceof Error ? caught.message : "error"}`,
      );
    } finally {
      setSugOcupado(false);
    }
  }

  /* ── edición masiva ── */

  const seleccionar = useCallback((ids: string[], valor: boolean) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (valor) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    setLoteAviso(null);
  }, []);

  async function aplicarLote(cambio: CambioLote) {
    const ids = [...seleccion];
    if (!ids.length) return;
    setLoteOcupado(true);
    setLoteAviso(null);
    try {
      const r = await fetch("/api/projects/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, patch: cambio }),
      });
      const d = (await r.json()) as {
        actualizados?: number;
        pedidos?: number;
        error?: string;
      };
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      await loadProjects();
      setSeleccion(new Set());
      // El aviso vive FUERA de la barra: al aplicarse se limpia la selección y
      // la barra desaparece, así que ahí el mensaje se perdía justo cuando hacía
      // falta leerlo.
      setLoteAviso(`Se cambiaron ${d.actualizados ?? 0} de ${d.pedidos ?? ids.length} proyectos.`);
    } catch (caught) {
      setLoteAviso(
        `No se pudo aplicar el lote: ${caught instanceof Error ? caught.message : "error"}`,
      );
    } finally {
      setLoteOcupado(false);
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
  const limpiarFiltros = () =>
    setF({ ...EMPTY, sort: f.sort, dir: f.dir, sort2: f.sort2, dir2: f.dir2, agrupar: f.agrupar });

  // Cada fila monta un componente completo (pastillas, barra de avance, acciones y,
  // al abrirla, un Detail). Pintar el catálogo entero de golpe deja la lista pesada
  // en celular. Se pinta por tandas; los filtros y el orden siguen actuando sobre
  // TODO el catálogo, no sobre lo que se ve.
  const unidades: Array<Familia<Project> | Project> = familias ?? filtered;
  const visibles = Math.min(pagina * PAGINA, unidades.length);
  const restantes = unidades.length - visibles;

  const filaProyecto = (project: Project) => (
    <ProjectRow
      key={project.id}
      project={project}
      now={now}
      open={openId === project.id}
      saving={savingId === project.id}
      relatedHint={relatedHint(project)}
      sugerencias={sugerenciasPorProyecto.get(project.id) ?? []}
      seleccionado={seleccion.has(project.id)}
      onSeleccionar={(v) => seleccionar([project.id], v)}
      onToggle={() => setOpenId((v) => (v === project.id ? null : project.id))}
      onInvite={() => setInviteProject(project)}
      onRepositories={() => setRepositoryProject(project)}
      onPatch={(patch) => void patchMeta(project.id, patch)}
      onNotesChanged={(notes) => onNotesChanged(project.id, notes)}
      onConfirmarSugerencia={(id) => void resolverSugerencias("confirmar", [id])}
      onRechazarSugerencia={(id) => void resolverSugerencias("rechazar", [id])}
      onClient={(c) => {
        upd({ client: c });
        setFiltersOpen(true);
      }}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <header className="border-b border-[var(--border-1)] bg-white px-page-sm md:px-page-md py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="mono-label">Control room</p>
            <h1 className="mt-0.5 text-[20px] font-semibold tracking-[-0.03em] text-black md:text-[22px]">
              Proyectos
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {sinSondear > 0 ? (
              <button
                type="button"
                onClick={() => void sondearDominios()}
                disabled={sondeando}
                className="btn-ghost shrink-0"
                title="Mide qué dominios responden para calcular el estado real"
              >
                <IconRefresh size={13} className={sondeando ? "animate-spin" : ""} />
                Sondear {sinSondear} dominios
              </button>
            ) : null}
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
        </div>
      </header>

      {syncMessage ? (
        <div className="border-b border-[var(--border-1)] bg-white px-page-sm md:px-page-md py-3 font-mono text-[12px] uppercase tracking-[0.11em] text-[var(--fg-secondary)]">
          {syncMessage}
        </div>
      ) : null}

      {loteAviso ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-1)] bg-white px-page-sm md:px-page-md py-3">
          <p className="text-[13px] text-black" aria-live="polite">
            {loteAviso}
          </p>
          <button
            type="button"
            onClick={() => setLoteAviso(null)}
            className="text-[12px] underline underline-offset-4"
          >
            Entendido
          </button>
        </div>
      ) : null}

      <SuggestionsPanel
        sugerencias={sugerencias}
        abierto={panelSugerencias}
        ocupado={sugOcupado}
        aviso={sugAviso}
        onAbrir={() => setPanelSugerencias((v) => !v)}
        onEscanear={() => void escanearSugerencias()}
        onConfirmar={(ids) => void resolverSugerencias("confirmar", ids)}
        onRechazar={(ids) => void resolverSugerencias("rechazar", ids)}
      />

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
        <div className="border-b border-[var(--border-1)] bg-[#f7f7f5] px-page-sm md:px-page-md py-6">
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
        <Stat
          label="Mostrando"
          value={`${filtered.length}`}
          note={
            familias
              ? `de ${projects.length} · ${agrupadas} familia${agrupadas === 1 ? "" : "s"}`
              : `de ${projects.length} proyectos`
          }
        />
        <Stat label="Movidos 7 días" value={`${stats.moved}`} note="con push reciente" />
        <Stat
          label="Vencidos"
          value={`${stats.overdue}`}
          note="entrega pasada sin cerrar"
          color={stats.overdue ? C.rojo : undefined}
          onClick={() => upd({ due: f.due === "overdue" ? "all" : "overdue" })}
        />
        <Stat
          label="Estado calculado"
          value={`${calculados}`}
          note="sin clasificar a mano"
          onClick={() => upd({ fuente: f.fuente === "calculado" ? "all" : "calculado" })}
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
      <section className="z-10 border-b border-[var(--border-1)] bg-[#f7f7f5]/95 px-page-sm md:px-page-md py-3 backdrop-blur md:sticky md:top-[59px]">
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
            <button
              type="button"
              onClick={() => upd({ agrupar: !f.agrupar })}
              aria-pressed={f.agrupar}
              title="Junta en una fila los proyectos que son la misma app"
              className={
                f.agrupar
                  ? "inline-flex min-h-11 items-center gap-2 rounded-md border border-black bg-black px-4 text-[13px] text-white"
                  : "inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-1)] bg-white px-4 text-[13px] text-black"
              }
            >
              Agrupar familias{f.agrupar && agrupadas ? ` · ${agrupadas}` : ""}
            </button>
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
            <Group label="Estado (real)">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  active={f.cats.includes(c.id)}
                  label={c.label}
                  n={count("cats", (p) => p.estado_real === c.id)}
                  onClick={() => upd({ cats: toggle(f.cats, c.id) })}
                />
              ))}
            </Group>

            <Group label="De dónde sale el estado">
              {FUENTES.map((x) => (
                <Chip
                  key={x.id}
                  active={f.fuente === x.id}
                  label={x.label}
                  n={
                    x.id === "all"
                      ? undefined
                      : count("fuente", (p) => p.estado_fuente === x.id)
                  }
                  onClick={() => upd({ fuente: x.id })}
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
                    if (fl.id === "sugerencias") return sugerenciasPorProyecto.has(p.id);
                    return !!familiasCatalogo.get(p.id)?.agrupada;
                  })}
                  onClick={() => upd({ flags: toggle(f.flags, fl.id) })}
                />
              ))}
            </Group>

            <div className="lg:col-span-2">
              <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
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
              onClick={limpiarFiltros}
              className="px-2 py-1 text-[12px] underline underline-offset-4"
            >
              Limpiar todo
            </button>
          </div>
        ) : null}

        {filtered.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-[var(--fg-secondary)]">
            <button
              type="button"
              onClick={() =>
                seleccionar(
                  filtered.map((p) => p.id),
                  !filtered.every((p) => seleccion.has(p.id)),
                )
              }
              className="underline underline-offset-4"
            >
              {filtered.every((p) => seleccion.has(p.id))
                ? `Quitar la selección (${filtered.length})`
                : `Seleccionar los ${filtered.length} del filtro`}
            </button>
            {seleccion.size > 0 ? <span>{seleccion.size} seleccionados</span> : null}
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
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_140px_150px_auto] gap-4 border-b border-[var(--border-1)] px-8 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--fg-muted)] lg:grid">
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
          <div className="px-page-sm md:px-page-md py-20 text-center">
            <IconLayout size={20} className="mx-auto" />
            <p className="mt-4 text-[14px] font-medium text-black">
              {projects.length === 0
                ? "No hay proyectos disponibles para esta cuenta."
                : "Ningún proyecto coincide con estos filtros."}
            </p>
            {nActive ? (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-3 text-[13px] underline underline-offset-4"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-1)]">
            {unidades.slice(0, visibles).map((u) =>
              esFamilia(u) ? (
                u.agrupada ? (
                  <FamilyRow
                    key={u.clave}
                    familia={u}
                    total={familiasCatalogo.get(u.miembros[0].id)?.miembros.length ?? u.miembros.length}
                    abierta={openFamilies.has(u.clave)}
                    seleccionada={u.miembros.every((m) => seleccion.has(m.id))}
                    now={now}
                    onAbrir={() =>
                      setOpenFamilies((prev) => {
                        const next = new Set(prev);
                        if (next.has(u.clave)) next.delete(u.clave);
                        else next.add(u.clave);
                        return next;
                      })
                    }
                    onSeleccionar={(v) => seleccionar(u.miembros.map((m) => m.id), v)}
                  >
                    <div className="divide-y divide-[var(--border-1)]">
                      {u.miembros.map((m) => filaProyecto(m))}
                    </div>
                  </FamilyRow>
                ) : (
                  filaProyecto(u.miembros[0])
                )
              ) : (
                filaProyecto(u)
              ),
            )}

            {restantes > 0 ? (
              <div className="px-page-sm md:px-page-md py-6 text-center">
                <p className="text-[12px] text-[var(--fg-muted)]" aria-live="polite">
                  {visibles} de {unidades.length} {familias ? "filas" : "proyectos"} en pantalla
                </p>
                <button
                  type="button"
                  onClick={() => setPagina((n) => n + 1)}
                  className="btn-ghost mt-3 !min-h-11 !px-5"
                >
                  Ver {Math.min(PAGINA, restantes)} más
                </button>
              </div>
            ) : unidades.length > PAGINA ? (
              <div className="px-page-sm md:px-page-md py-6 text-center">
                <p className="text-[12px] text-[var(--fg-muted)]">
                  Se muestran los {filtered.length} proyectos
                  {familias ? ` en ${unidades.length} filas` : ""}.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <BulkBar
        seleccionados={seleccion.size}
        ocupado={loteOcupado}
        onAplicar={(cambio) => void aplicarLote(cambio)}
        onLimpiar={() => {
          setSeleccion(new Set());
          setLoteAviso(null);
        }}
      />
    </div>
  );
}

function esFamilia(u: Familia<Project> | Project): u is Familia<Project> {
  return "miembros" in u;
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
  if (f.fuente !== "all")
    out.push({
      key: "fu",
      label: `Estado: ${FUENTES.find((x) => x.id === f.fuente)?.label}`,
      clear: () => upd({ fuente: "all" }),
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
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
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
      <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
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
  sugerencias,
  seleccionado,
  onSeleccionar,
  onToggle,
  onInvite,
  onRepositories,
  onPatch,
  onNotesChanged,
  onConfirmarSugerencia,
  onRechazarSugerencia,
  onClient,
}: {
  project: Project;
  now: number;
  open: boolean;
  saving: boolean;
  relatedHint: string | null;
  sugerencias: SugerenciaLista[];
  seleccionado: boolean;
  onSeleccionar: (v: boolean) => void;
  onToggle: () => void;
  onInvite: () => void;
  onRepositories: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onNotesChanged: (notes: Note[]) => void;
  onConfirmarSugerencia: (id: string) => void;
  onRechazarSugerencia: (id: string) => void;
  onClient: (c: string) => void;
}) {
  const externalUrl = normalizeExternalUrl(p.domain || p.vercel_url);
  const active =
    p.estado_real === "produccion" || p.estado_real === "activo" || p.estado_real === "en_revision";
  const pct = Math.max(0, Math.min(100, p.progress_pct ?? 0));
  const due = dueInfo(p, todayStart());
  const debe = owed(p);
  const lastMove = p.last_push ?? null;
  const calculado = p.estado_fuente === "calculado";
  const clienteSugerido = sugerencias.find((s) => s.campo === "client_name");

  return (
    <article className={open ? "bg-[#fafaf8]" : undefined}>
      <div className="grid gap-4 px-page-sm md:px-page-md py-5 transition hover:bg-[#fafaf8] lg:grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_140px_150px_auto] lg:items-start xl:px-page-lg">
        {/* proyecto */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              checked={seleccionado}
              onChange={(e) => onSeleccionar(e.target.checked)}
              aria-label={`Seleccionar ${p.name}`}
              className="h-4 w-4 shrink-0 accent-black"
            />
            <span className="status-shape shrink-0" data-active={active} />
            <button
              type="button"
              onClick={onToggle}
              className="truncate text-left text-[15px] font-medium tracking-[-0.02em] hover:underline"
            >
              {p.name}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onPatch({ delivery_priority: !p.delivery_priority })}
              className={
                p.delivery_priority
                  ? "rounded-full border border-black px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.1em]"
                  : "rounded-full border border-dashed border-[var(--border-1)] px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fg-muted)]"
              }
            >
              {p.delivery_priority ? "Prioridad" : "Priorizar"}
            </button>
            <span
              title={p.estado_motivo}
              className="rounded-full border border-[var(--border-1)] px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fg-secondary)]"
            >
              {CATEGORY_LABELS[p.estado_real] ?? p.estado_real}
            </span>
            {calculado ? (
              <span
                title={`Estado calculado: ${p.estado_motivo}. Elige un estado en el detalle para fijarlo a mano.`}
                className="rounded-full border border-dashed border-[var(--border-1)] px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--fg-muted)]"
              >
                estado calculado
              </span>
            ) : null}
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
            ) : clienteSugerido ? (
              <span title={`fuente: ${clienteSugerido.fuente}`}>
                <span className="italic">Sin cliente</span> · sugerido{" "}
                <button
                  type="button"
                  onClick={() => onConfirmarSugerencia(clienteSugerido.id)}
                  className="font-medium text-black underline underline-offset-2"
                >
                  {clienteSugerido.valor}
                </button>
              </span>
            ) : (
              <span className="italic">Sin cliente</span>
            )}
            <span className="font-mono"> · {p.id}</span>
            {relatedHint ? <span> · {relatedHint}</span> : null}
          </p>
          <p className="mt-0.5 truncate pl-[15px] text-[12px] text-[var(--fg-muted)]">
            {calculado ? `Estado calculado: ${p.estado_motivo}` : p.estado_motivo}
          </p>
          {p.last_note ? (
            <button
              type="button"
              onClick={onToggle}
              className="mt-2 ml-[15px] block max-w-full rounded-md border-l-2 border-black bg-white px-2.5 py-1.5 text-left text-[12px] leading-5 text-[var(--fg-secondary)]"
            >
              <span className="line-clamp-2">“{p.last_note.body}”</span>
              <span className="mt-0.5 block font-mono text-[12px] text-[var(--fg-muted)]">
                {hace(p.last_note.created_at, now)} · {p.notes_count} comentario
                {p.notes_count === 1 ? "" : "s"}
              </span>
            </button>
          ) : null}
        </div>

        {/* origen */}
        <div className="min-w-0 text-[12px]">
          {p.github_repo ? (
            <span className="inline-flex max-w-full items-center gap-1.5 font-mono text-[12px] text-[var(--fg-secondary)]">
              <IconGithub size={12} className="shrink-0" />
              <span className="truncate">{p.github_repo}</span>
            </span>
          ) : (
            <span className="font-mono text-[12px] text-[var(--fg-muted)]">Sin repositorio</span>
          )}
          {p.domain || p.vercel_url ? (
            <p className="mt-1 truncate font-mono text-[12px] text-[var(--fg-muted)]">{p.domain ?? p.vercel_url}</p>
          ) : null}
          <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
            {[
              p.github_language,
              (p.repository_count ?? 0) > 1 ? `${p.repository_count} repos` : null,
              p.health_checked_at
                ? `dominio ${p.health_ok ? `${p.health_status} OK` : p.health_status ?? "sin respuesta"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>

        {/* actividad */}
        <div className="text-[12px]">
          <p className="font-medium text-black">{lastMove ? hace(lastMove, now) : "Sin push"}</p>
          <p className="text-[12px] text-[var(--fg-muted)]">último push</p>
          <p className="mt-1.5 text-[12px] text-[var(--fg-muted)]">Alta {fecha(p.created_at)}</p>
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
            <span className="font-mono text-[12px] tabular-nums">{pct}%</span>
          </div>
          {p.contract_amount ? (
            <p className="mt-1.5 text-[12px] text-[var(--fg-secondary)]">
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
            className="btn-ghost !min-h-9 !px-3"
          >
            Detalle
            <IconChevD size={12} className={open ? "rotate-180 transition" : "transition"} />
          </button>
          <Link href={`/app/live/${encodeURIComponent(p.id)}`} className="btn-primary !min-h-9 !px-4">
            <IconLayout size={12} /> Sala
          </Link>
        </div>
      </div>

      {open ? (
        <Detail
          project={p}
          now={now}
          saving={saving}
          externalUrl={externalUrl}
          sugerencias={sugerencias}
          onPatch={onPatch}
          onNotesChanged={onNotesChanged}
          onInvite={onInvite}
          onRepositories={onRepositories}
          onConfirmarSugerencia={onConfirmarSugerencia}
          onRechazarSugerencia={onRechazarSugerencia}
        />
      ) : null}
    </article>
  );
}

function Detail({
  project: p,
  now,
  saving,
  externalUrl,
  sugerencias,
  onPatch,
  onNotesChanged,
  onInvite,
  onRepositories,
  onConfirmarSugerencia,
  onRechazarSugerencia,
}: {
  project: Project;
  now: number;
  saving: boolean;
  externalUrl: string | null;
  sugerencias: SugerenciaLista[];
  onPatch: (patch: Record<string, unknown>) => void;
  onNotesChanged: (notes: Note[]) => void;
  onInvite: () => void;
  onRepositories: () => void;
  onConfirmarSugerencia: (id: string) => void;
  onRechazarSugerencia: (id: string) => void;
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
  const label = "font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]";
  const sugerencia = (campo: string) => sugerencias.find((s) => s.campo === campo);

  const pista = (campo: string) => {
    const s = sugerencia(campo);
    if (!s) return null;
    return (
      <span className="mt-1 block text-[12px] text-[var(--fg-tertiary)]">
        Sugerido: <strong className="font-medium text-black">{valorSugerido(s.campo, s.valor)}</strong> ·
        fuente: {s.fuente}
        {s.detalle ? ` · ${s.detalle}` : ""}
        <button
          type="button"
          onClick={() => onConfirmarSugerencia(s.id)}
          className="ml-2 underline underline-offset-4"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => onRechazarSugerencia(s.id)}
          className="ml-2 underline underline-offset-4"
        >
          Descartar
        </button>
      </span>
    );
  };

  return (
    <div className="grid gap-6 border-t border-[var(--border-1)] px-page-sm md:px-page-md pb-6 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:px-page-lg">
      {/* datos editables */}
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
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
          <span className="mt-1 block text-[12px] text-[var(--fg-tertiary)]">
            {p.estado_fuente === "calculado" ? (
              <>
                Hoy se muestra como{" "}
                <strong className="font-medium text-black">
                  {CATEGORY_LABELS[p.estado_real] ?? p.estado_real}
                </strong>{" "}
                (calculado: {p.estado_motivo}). Si eliges un estado aquí, manda el tuyo.
              </>
            ) : (
              <>Lo pusiste a mano: {p.estado_motivo}.</>
            )}
          </span>
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
          {pista("client_name")}
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
          {pista("contract_amount")}
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
          {pista("paid_amount")}
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
          <p>
            Dominio:{" "}
            {p.health_checked_at
              ? `${p.health_ok ? "responde" : "no responde"} ${p.health_status ?? ""} · ${fecha(
                  p.health_checked_at,
                  true,
                )}`
              : hasDomain(p)
                ? "sin sondear"
                : "sin dominio"}
          </p>
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
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="button" onClick={onRepositories} className="btn-ghost !min-h-9 !px-3">
            Repositorios ({p.repository_count ?? 0})
          </button>
          <button type="button" onClick={onInvite} className="btn-ghost !min-h-9 !px-3">
            Invitar al cliente
          </button>
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !min-h-9 !px-3"
            >
              Abrir sitio
            </a>
          ) : null}
        </div>
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
            <span className="text-[12px] text-[var(--fg-muted)]">Ctrl + Enter para guardar</span>
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
            <li className="text-[13px] text-[var(--fg-muted)]">
              Todavía no hay comentarios en esta pantalla.
              {(p.notes_count ?? 0) > 0
                ? " Los que ves en el contador vienen de la sala con el cliente."
                : ""}
            </li>
          ) : null}
          {notes?.map((n) => (
            <li key={n.id} className="group rounded-md border border-[var(--border-1)] bg-white px-3 py-2">
              <p className="whitespace-pre-wrap text-[13px] leading-5 text-black">{n.body}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[12px] text-[var(--fg-muted)]">
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
          className="grid animate-pulse gap-4 px-page-sm md:px-page-md py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_140px_150px_auto] xl:px-page-lg"
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
