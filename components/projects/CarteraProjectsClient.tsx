"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowR, IconBranch, IconClock, IconInfo } from "@/components/brand/VFIcons";
import { BarraFiltros, GrupoFiltros } from "@/components/ui/BarraFiltros";
import type { CarteraProject, CcnHealthLevel } from "@/lib/projects/cartera";

type SectionId = "p1" | "clientes" | "productos" | "mantenimiento" | "aire";

interface Filters {
  tipos: string[];
  prioridades: string[];
  estados: string[];
}

const EMPTY: Filters = { tipos: [], prioridades: [], estados: [] };
const TZ = "America/Cancun";

const TYPE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  socios: "Socios",
  comercializamos: "Comercializable",
  centro_control: "Centro de control",
  inversion_momentum: "Momentum",
  store: "Store",
  institucional: "Institucional",
};

const SECTIONS: Array<{ id: SectionId; title: string; hint: string }> = [
  { id: "p1", title: "Prioridad 1", hint: "Lo que Luis marco como urgente o fuerte." },
  { id: "clientes", title: "Clientes activos", hint: "Clientes vivos o con entrega pendiente." },
  { id: "productos", title: "Nuestros productos", hint: "Activos propios, centro de control y venta." },
  { id: "mantenimiento", title: "Mantenimiento", hint: "Cerrados o vivos con soporte puntual." },
  { id: "aire", title: "En el aire / parados", hint: "Relaciones pausadas, abandonadas o por definir." },
];

export default function CarteraProjectsClient({
  projects,
}: {
  projects: CarteraProject[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const autoIntentado = useRef(false);

  // La cartera sale de docs/auditoria/repos.json. Si la DB todavía no la tiene,
  // se carga sola (idempotente); después Luis puede recargarla con el botón.
  async function cargarAuditoria() {
    setCargando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/projects/cartera/importar", { method: "POST" });
      const d = (await r.json().catch(() => null)) as { reales?: number; demos?: number; error?: string } | null;
      if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
      setAviso(`Cartera cargada: ${d?.reales ?? 0} proyectos reales y ${d?.demos ?? 0} demos.`);
      window.location.reload();
    } catch (error) {
      setAviso(`No se pudo cargar la auditoría: ${error instanceof Error ? error.message : "error"}`);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    if (projects.length === 0 && !autoIntentado.current) {
      autoIntentado.current = true;
      void cargarAuditoria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);
  const update = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));

  const tipos = useMemo(
    () => [...new Set(projects.flatMap((project) => project.cartera_tipo))].sort(),
    [projects],
  );
  const estados = useMemo(
    () =>
      [...new Set(projects.map((project) => project.cartera_estado).filter(Boolean) as string[])].sort(),
    [projects],
  );

  const filtered = useMemo(
    () => projects.filter((project) => passes(project, filters)),
    [projects, filters],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<SectionId, CarteraProject[]>();
    for (const section of SECTIONS) buckets.set(section.id, []);
    for (const project of filtered) {
      buckets.get(sectionFor(project))?.push(project);
    }
    return buckets;
  }, [filtered]);

  const active =
    filters.tipos.length + filters.prioridades.length + filters.estados.length;

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--border-1)] bg-white px-page-sm py-6 md:px-page-md xl:px-page-lg">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Cartera VForge
            </p>
            <h1 className="mt-2 text-[30px] font-semibold leading-none text-black md:text-[42px]">
              Proyectos reales
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--fg-secondary)]">
              La cartera sale de la auditoría y de la DB. Las demos viven aparte para no mezclar stock con compromisos reales.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
              <Link href="/app/demos" className="rounded-md border border-black bg-black px-3 py-2 font-semibold text-white">
                Catálogo de demos
              </Link>
              <Link href="/app/projects/curar" className="rounded-md border border-[var(--border-1)] bg-white px-3 py-2 font-medium hover:border-black">
                Ordenar repos
              </Link>
              <Link href="/app/projects/todos" className="rounded-md border border-[var(--border-1)] bg-white px-3 py-2 font-medium hover:border-black">
                Inventario completo
              </Link>
              <button
                type="button"
                onClick={() => void cargarAuditoria()}
                disabled={cargando}
                className="rounded-md border border-[var(--border-1)] bg-white px-3 py-2 font-medium hover:border-black disabled:opacity-50"
              >
                {cargando ? "Cargando auditoría…" : "Recargar auditoría"}
              </button>
            </div>
            {aviso ? <p className="mt-2 text-[12px] text-[var(--fg-secondary)]">{aviso}</p> : null}
          </div>
          <div className="grid grid-cols-3 border border-[var(--border-1)] bg-white">
            <Kpi label="Reales" value={projects.length} />
            <Kpi label="Filtrados" value={filtered.length} />
            <Kpi label="P1" value={projects.filter((project) => project.cartera_prioridad === 1).length} />
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--border-1)] bg-[var(--color-background)]/95 px-page-sm py-4 backdrop-blur md:px-page-md xl:px-page-lg">
        <BarraFiltros
          resumen={`${filtered.length} de ${projects.length} proyectos`}
          activos={active}
          onLimpiar={() => setFilters(EMPTY)}
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <GrupoFiltros
              etiqueta="Tipo"
              multiple
              todos={{ label: "Todos", n: projects.length }}
              opciones={tipos.map((tipo) => ({
                id: tipo,
                label: tipoLabel(tipo),
                n: projects.filter((project) => project.cartera_tipo.includes(tipo)).length,
              }))}
              valor={filters.tipos}
              onCambio={(tiposValue) => update({ tipos: tiposValue })}
            />
            <GrupoFiltros
              etiqueta="Prioridad"
              multiple
              todos={{ label: "Todas", n: projects.length }}
              opciones={["1", "2", "3", "sin"].map((prioridad) => ({
                id: prioridad,
                label: prioridad === "sin" ? "Sin prioridad" : `P${prioridad}`,
                n: projects.filter((project) => priorityId(project) === prioridad).length,
              }))}
              valor={filters.prioridades}
              onCambio={(prioridades) => update({ prioridades })}
            />
            <GrupoFiltros
              etiqueta="Estado"
              multiple
              todos={{ label: "Todos", n: projects.length }}
              opciones={estados.map((estado) => ({
                id: estado,
                label: estadoHumano(estado),
                n: projects.filter((project) => project.cartera_estado === estado).length,
              }))}
              valor={filters.estados}
              onCambio={(estadosValue) => update({ estados: estadosValue })}
            />
          </div>
        </BarraFiltros>
      </section>

      <div className="grid gap-8 px-page-sm py-7 md:px-page-md xl:px-page-lg">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-[var(--border-1)] bg-white px-6 py-14 text-center">
            <IconInfo size={18} className="mx-auto" />
            <p className="mt-3 text-[14px] font-medium text-black">
              No hay proyectos reales con esos filtros.
            </p>
          </div>
        ) : null}

        {SECTIONS.map((section) => {
          const items = grouped.get(section.id) ?? [];
          if (!items.length) return null;
          return (
            <section key={section.id} className="min-w-0">
              <div className="mb-3 flex min-w-0 flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold leading-tight text-black">{section.title}</h2>
                  <p className="text-[13px] text-[var(--fg-secondary)]">{section.hint}</p>
                </div>
                <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  {items.length} proyecto{items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid gap-3">
                {items.map((project) => (
                  <CompactProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function CompactProjectCard({ project }: { project: CarteraProject }) {
  const primary = project.repositories.find((repo) => repo.is_primary) ?? project.repositories[0] ?? null;
  return (
    <article className="grid min-w-0 gap-4 rounded-lg border border-[var(--border-1)] bg-white p-4 md:grid-cols-[minmax(0,1.25fr)_minmax(260px,.85fr)_160px] md:items-center md:p-5">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {project.cartera_tipo.map((tipo) => (
            <span key={tipo} className="rounded-full border border-[var(--border-1)] px-2.5 py-1 text-[11px] font-medium text-black">
              {tipoLabel(tipo)}
            </span>
          ))}
          <HealthPill level={project.health.level} label={project.health.label} />
        </div>
        <h3 className="mt-3 break-words text-[22px] font-semibold leading-tight text-black">
          {project.name}
        </h3>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          {estadoHumano(project.cartera_estado)} - {priorityText(project.cartera_prioridad)}
        </p>
        {project.cartera_nota ? (
          <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[var(--fg-muted)]">
            {project.cartera_nota}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-3">
        <div className="grid min-w-0 gap-2 rounded-md border border-[var(--border-1)] bg-[var(--color-background)] p-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            <IconBranch size={12} />
            Repos agrupados
          </p>
          {project.repository_groups.length ? (
            project.repository_groups.map((group) => (
              <p key={group.label} className="min-w-0 text-[12px] text-[var(--fg-secondary)]">
                <span className="font-medium text-black">{group.label}:</span>{" "}
                <span className="break-words font-mono">
                  {group.repos.map((repo) => shortRepo(repo.repo_full_name)).join(", ")}
                </span>
              </p>
            ))
          ) : (
            <p className="text-[12px] text-[var(--fg-muted)]">sin repos ligados</p>
          )}
        </div>
        <div className="grid gap-1">
          {project.health.signals.map((signal) => (
            <p key={signal.label} className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--fg-secondary)]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: healthColor(signal.level) }}
              />
              <span className="min-w-0 truncate">
                {signal.label}: {signal.text}
              </span>
            </p>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 md:justify-items-end">
        <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--fg-secondary)]">
          <IconClock size={12} />
          <span className="truncate">Push: {fecha(project.last_push)}</span>
        </p>
        <p className="max-w-full truncate font-mono text-[12px] text-[var(--fg-muted)]">
          {primary?.repo_full_name ?? "sin repo principal"}
        </p>
        <Link
          href={`/app/projects/${encodeURIComponent(project.id)}/expediente`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-black bg-black px-4 text-[13px] font-semibold text-white"
        >
          Abrir expediente
          <IconArrowR size={13} />
        </Link>
      </div>
    </article>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[92px] border-r border-[var(--border-1)] px-4 py-3 last:border-r-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none text-black">{value}</p>
    </div>
  );
}

function HealthPill({ level, label }: { level: CcnHealthLevel; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-1)] px-2.5 py-1 text-[11px] font-medium text-black">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: healthColor(level) }} />
      Salud: {label}
    </span>
  );
}

function passes(project: CarteraProject, filters: Filters) {
  if (filters.tipos.length && !filters.tipos.some((tipo) => project.cartera_tipo.includes(tipo))) return false;
  if (filters.prioridades.length && !filters.prioridades.includes(priorityId(project))) return false;
  if (filters.estados.length && !project.cartera_estado) return false;
  if (filters.estados.length && project.cartera_estado && !filters.estados.includes(project.cartera_estado)) return false;
  return true;
}

function sectionFor(project: CarteraProject): SectionId {
  const state = project.cartera_estado ?? "";
  if (project.cartera_prioridad === 1) return "p1";
  if (
    project.cartera_tipo.includes("cliente") &&
    /activo|al_corriente|entrega|satisfecho/.test(state)
  ) {
    return "clientes";
  }
  if (state.includes("mantenimiento") || state.includes("cerrado")) return "mantenimiento";
  if (
    project.cartera_tipo.some((tipo) =>
      ["comercializamos", "centro_control", "inversion_momentum", "store", "institucional", "socios"].includes(tipo),
    )
  ) {
    return "productos";
  }
  return "aire";
}

function priorityId(project: CarteraProject) {
  return project.cartera_prioridad ? String(project.cartera_prioridad) : "sin";
}

function priorityText(priority: number | null) {
  return priority ? `prioridad ${priority}` : "sin prioridad";
}

function tipoLabel(tipo: string) {
  return TYPE_LABELS[tipo] ?? estadoHumano(tipo);
}

function estadoHumano(value: string | null | undefined) {
  if (!value) return "sin estado";
  const labels: Record<string, string> = {
    activo_al_corriente: "activo al corriente",
    activo_le_debemos_entrega: "activo, le debemos entrega",
    cliente_satisfecho_le_debemos_mejoras: "cliente satisfecho, debemos mejoras",
    cliente_abandono: "cliente abandono",
    cerrado_mantenimiento: "cerrado, mantenimiento",
    medio_parado: "medio parado",
    relacion_rota_no_pago: "relacion rota, no pago",
    parado_abandonado: "parado o abandonado",
    buscar_al_cliente: "buscar al cliente",
    le_quedamos_mal_dinero_devuelto: "dinero devuelto, recuperar producto",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function fecha(value: string | null | undefined) {
  if (!value) return "sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin dato";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function shortRepo(fullName: string) {
  return fullName.split("/").pop() ?? fullName;
}

function healthColor(level: CcnHealthLevel) {
  if (level === "ok") return "var(--health-ok)";
  if (level === "warn") return "var(--health-warn)";
  if (level === "bad") return "var(--health-bad)";
  return "var(--health-unknown)";
}
