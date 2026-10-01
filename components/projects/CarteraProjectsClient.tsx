"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Plus,
  Search,
  X,
} from "lucide-react";
import { IconArrowR, IconBranch, IconClock, IconInfo } from "@/components/brand/VFIcons";
import { ProjectChats } from "@/components/hilo/ProjectChats";
import { BarraFiltros, GrupoFiltros } from "@/components/ui/BarraFiltros";
import type { CarteraProject, CcnHealthLevel, DemoProject } from "@/lib/projects/cartera";
import type { ProjectRepository } from "@/lib/projects/repository-groups";
import {
  PROJECT_ETAPA_LABELS,
  PROJECT_ETAPA_LATERAL,
  PROJECT_ETAPA_VALUES,
  etapaLabel,
  nextProjectEtapa,
  previousProjectEtapa,
  type ProjectEtapa,
  type ProjectEtapaHistoryItem,
} from "@/lib/projects/etapas";

type SectionId = "p1" | "clientes" | "productos" | "mantenimiento" | "aire";
type TabId = "cartera" | "linea";

interface Filters {
  tipos: string[];
  prioridades: string[];
  estados: string[];
}

interface AltaForm {
  cliente_nombre: string;
  project_name: string;
  cliente_whatsapp: string;
  rubro: string;
  demo_id: string;
}

interface AltaResult {
  project?: { id: string; name: string; github_repo: string | null; github_url: string | null };
  mode?: string;
  instructions?: string[];
  error?: string;
}

interface EtapaPayload {
  project?: {
    id: string;
    etapa: ProjectEtapa | null;
    demo_url: string | null;
    contrato_url: string | null;
  };
  history?: ProjectEtapaHistoryItem[];
  error?: string;
}

const EMPTY: Filters = { tipos: [], prioridades: [], estados: [] };
const EMPTY_ALTA: AltaForm = {
  cliente_nombre: "",
  project_name: "",
  cliente_whatsapp: "",
  rubro: "",
  demo_id: "",
};
const TZ = "America/Cancun";
const DAY = 86_400_000;

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
  { id: "p1", title: "Prioridad 1", hint: "Lo que Luis marcó como urgente o fuerte." },
  { id: "clientes", title: "Clientes activos", hint: "Clientes vivos o con entrega pendiente." },
  { id: "productos", title: "Nuestros productos", hint: "Activos propios, centro de control y venta." },
  { id: "mantenimiento", title: "Mantenimiento", hint: "Cerrados o vivos con soporte puntual." },
  { id: "aire", title: "En el aire / parados", hint: "Relaciones pausadas, abandonadas o por definir." },
];

export default function CarteraProjectsClient({
  projects,
  demos,
}: {
  projects: CarteraProject[];
  demos: DemoProject[];
}) {
  const [items, setItems] = useState(projects);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [tab, setTab] = useState<TabId>("cartera");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [altaOpen, setAltaOpen] = useState(false);
  const [altaBusy, setAltaBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const autoIntentado = useRef(false);

  useEffect(() => setItems(projects), [projects]);

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
    if (items.length === 0 && !autoIntentado.current) {
      autoIntentado.current = true;
      void cargarAuditoria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const update = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));

  const tipos = useMemo(
    () => [...new Set(items.flatMap((project) => project.cartera_tipo))].sort(),
    [items],
  );
  const estados = useMemo(
    () =>
      [...new Set(items.map((project) => project.cartera_estado).filter(Boolean) as string[])].sort(),
    [items],
  );

  const filtered = useMemo(
    () => items.filter((project) => passes(project, filters)),
    [items, filters],
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

  async function submitAlta(form: AltaForm) {
    setAltaBusy(true);
    setAviso(null);
    // La copia de la demo tarda; el error tiene que verse dentro del modal.
    try {
      const response = await fetch("/api/projects/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => null)) as AltaResult | null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      if (!payload?.project) throw new Error("La respuesta no trajo proyecto.");

      const now = new Date().toISOString();
      const inserted = projectFromAlta(form, payload.project, now);
      setItems((current) => [inserted, ...current.filter((item) => item.id !== inserted.id)]);
      setCreated({ id: inserted.id, name: inserted.name });
      setAltaOpen(false);
      setTab("linea");
      setAviso(`Cliente dado de alta: ${inserted.cliente_nombre ?? inserted.name}.`);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo dar de alta al cliente.");
    } finally {
      setAltaBusy(false);
    }
  }

  async function moverEtapa(project: CarteraProject, action: "avanzar" | "regresar" | "perdido") {
    const target = targetForAction(project.etapa, action);
    if (!target) return;

    const body: Record<string, string> = { action };
    if (target === "demo_entregada") {
      const demoUrl = window.prompt("Pega el enlace de la demo entregada", project.demo_url ?? "");
      if (!demoUrl?.trim()) return;
      body.demo_url = demoUrl.trim();
    }
    if (target === "contrato_enviado") {
      const contratoUrl = window.prompt("Pega el enlace del contrato enviado", project.contrato_url ?? "");
      if (!contratoUrl?.trim()) return;
      body.contrato_url = contratoUrl.trim();
    }
    const nota = window.prompt("Nota opcional para el historial", "");
    if (nota?.trim()) body.nota = nota.trim();

    setAviso(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/etapa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as EtapaPayload | null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      if (!payload?.project) throw new Error("La respuesta no trajo proyecto.");
      setItems((current) => current.map((item) => mergeEtapa(item, payload)));
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo mover la etapa.");
    }
  }

  function markChatLoaded(projectId: string) {
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((project) => {
        if (project.id !== projectId || project.etapa !== "prospecto") return project;
        return {
          ...project,
          etapa: "chat_cargado",
          etapa_creado_en: now,
          etapa_nota: "Primer chat cargado.",
          etapa_historial: [
            ...project.etapa_historial,
            {
              id: `local-chat-${projectId}`,
              project_id: projectId,
              etapa: "chat_cargado",
              nota: "Primer chat cargado.",
              creado_por: null,
              creado_en: now,
            },
          ],
        };
      }),
    );
  }

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
              Clientes, demos usadas como base y entregas reales en una sola línea operativa.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={() => setAltaOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-4 font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <Plus size={14} />
                Alta de cliente nuevo
              </button>
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
            <Kpi label="Reales" value={items.length} />
            <Kpi label="Filtrados" value={filtered.length} />
            <Kpi label="Demos por entregar" value={items.filter((project) => project.etapa === "demo_en_construccion").length} />
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--border-1)] bg-white px-page-sm md:px-page-md xl:px-page-lg">
        <div className="flex min-w-0 gap-1 py-2">
          <TabButton active={tab === "cartera"} onClick={() => setTab("cartera")} label="Cartera" />
          <TabButton active={tab === "linea"} onClick={() => setTab("linea")} label="Línea de avance" />
        </div>
      </section>

      {created ? (
        <section className="px-page-sm pt-5 md:px-page-md xl:px-page-lg">
          <ProjectChats
            projectId={created.id}
            initialChats={[]}
            liveActive={false}
            uploadTone="ink"
            onUploaded={(payload) => {
              if (payload.etapa_actualizada === "chat_cargado") markChatLoaded(created.id);
            }}
            className="rounded-lg border border-[var(--border-1)]"
          />
        </section>
      ) : null}

      {tab === "cartera" ? (
        <>
          <section className="border-b border-[var(--border-1)] bg-[var(--color-background)]/95 px-page-sm py-4 backdrop-blur md:px-page-md xl:px-page-lg">
            <BarraFiltros
              resumen={`${filtered.length} de ${items.length} proyectos`}
              activos={active}
              onLimpiar={() => setFilters(EMPTY)}
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <GrupoFiltros
                  etiqueta="Tipo"
                  multiple
                  todos={{ label: "Todos", n: items.length }}
                  opciones={tipos.map((tipo) => ({
                    id: tipo,
                    label: tipoLabel(tipo),
                    n: items.filter((project) => project.cartera_tipo.includes(tipo)).length,
                  }))}
                  valor={filters.tipos}
                  onCambio={(tiposValue) => update({ tipos: tiposValue })}
                />
                <GrupoFiltros
                  etiqueta="Prioridad"
                  multiple
                  todos={{ label: "Todas", n: items.length }}
                  opciones={["1", "2", "3", "sin"].map((prioridad) => ({
                    id: prioridad,
                    label: prioridad === "sin" ? "Sin prioridad" : `P${prioridad}`,
                    n: items.filter((project) => priorityId(project) === prioridad).length,
                  }))}
                  valor={filters.prioridades}
                  onCambio={(prioridades) => update({ prioridades })}
                />
                <GrupoFiltros
                  etiqueta="Estado"
                  multiple
                  todos={{ label: "Todos", n: items.length }}
                  opciones={estados.map((estado) => ({
                    id: estado,
                    label: estadoHumano(estado),
                    n: items.filter((project) => project.cartera_estado === estado).length,
                  }))}
                  valor={filters.estados}
                  onCambio={(estadosValue) => update({ estados: estadosValue })}
                />
              </div>
            </BarraFiltros>
          </section>
          <CarteraList filtered={filtered} grouped={grouped} />
        </>
      ) : (
        <LineaAvance projects={items} onMove={moverEtapa} />
      )}

      {altaOpen ? (
        <AltaClienteModal
          demos={demos}
          busy={altaBusy}
          error={aviso}
          onClose={() => setAltaOpen(false)}
          onSubmit={(form) => void submitAlta(form)}
        />
      ) : null}
    </main>
  );
}

function CarteraList({
  filtered,
  grouped,
}: {
  filtered: CarteraProject[];
  grouped: Map<SectionId, CarteraProject[]>;
}) {
  return (
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
  );
}

function LineaAvance({
  projects,
  onMove,
}: {
  projects: CarteraProject[];
  onMove: (project: CarteraProject, action: "avanzar" | "regresar" | "perdido") => void;
}) {
  const byStage = useMemo(() => {
    const map = new Map<ProjectEtapa, CarteraProject[]>();
    for (const stage of PROJECT_ETAPA_VALUES) map.set(stage, []);
    for (const project of projects) {
      const stage = project.etapa ?? "prospecto";
      map.get(stage)?.push(project);
    }
    return map;
  }, [projects]);
  const demosPorEntregar = byStage.get("demo_en_construccion") ?? [];

  return (
    <section className="grid gap-5 px-page-sm py-6 md:px-page-md xl:px-page-lg">
      <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-10">
        {PROJECT_ETAPA_VALUES.map((stage) => (
          <div key={stage} className="border border-[var(--border-1)] bg-white px-3 py-3">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              {PROJECT_ETAPA_LABELS[stage]}
            </p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-black">
              {byStage.get(stage)?.length ?? 0}
            </p>
          </div>
        ))}
      </div>

      <section className="min-w-0 border-y border-[var(--border-1)] bg-white py-4">
        <div className="px-4">
          <h2 className="text-[18px] font-semibold text-black">Demos por entregar</h2>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            {demosPorEntregar.length
              ? `${demosPorEntregar.length} proyecto${demosPorEntregar.length === 1 ? "" : "s"} en demo en construcción.`
              : "No hay demos pendientes de entrega."}
          </p>
        </div>
      </section>

      <div className="min-w-0 overflow-x-auto pb-2">
        <div className="grid min-w-[2800px] grid-cols-10 gap-3">
          {PROJECT_ETAPA_VALUES.map((stage) => (
            <section key={stage} className="min-w-0">
              <div className="mb-2 border-b border-black pb-2">
                <h3 className="truncate text-[14px] font-semibold text-black">{PROJECT_ETAPA_LABELS[stage]}</h3>
                <p className="text-[12px] text-[var(--fg-muted)]">
                  {byStage.get(stage)?.length ?? 0} proyecto{(byStage.get(stage)?.length ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid gap-3">
                {(byStage.get(stage) ?? []).length ? (
                  (byStage.get(stage) ?? []).map((project) => (
                    <EtapaCard key={project.id} project={project} onMove={onMove} />
                  ))
                ) : (
                  <div className="border border-dashed border-[var(--border-1)] bg-white px-3 py-6 text-center text-[12px] text-[var(--fg-muted)]">
                    Sin proyectos
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function EtapaCard({
  project,
  onMove,
}: {
  project: CarteraProject;
  onMove: (project: CarteraProject, action: "avanzar" | "regresar" | "perdido") => void;
}) {
  const stage = project.etapa ?? "prospecto";
  const canAdvance = Boolean(nextProjectEtapa(stage));
  const canReturn = Boolean(previousProjectEtapa(stage)) || stage === PROJECT_ETAPA_LATERAL;
  const latest = latestEtapa(project);

  return (
    <article className="min-w-0 rounded-lg border border-[var(--border-1)] bg-white p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-[var(--fg-muted)]">
            {project.cliente_nombre || "Sin cliente capturado"}
          </p>
          <h4 className="mt-1 break-words text-[15px] font-semibold leading-tight text-black">
            {project.name}
          </h4>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border-1)] px-2 py-1 font-mono text-[10px] uppercase text-[var(--fg-muted)]">
          {daysInStage(project)} d
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-[12px] text-[var(--fg-secondary)]">
        <p className="line-clamp-2">
          <span className="font-medium text-black">Último evento:</span>{" "}
          {latest ? `${etapaLabel(latest.etapa)}${latest.nota ? ` · ${latest.nota}` : ""}` : "sin historial"}
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          {project.demo_url ? <MiniLink href={project.demo_url} label="Demo" /> : null}
          {project.contrato_url ? <MiniLink href={project.contrato_url} label="Contrato" /> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canReturn}
          onClick={() => onMove(project, "regresar")}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--border-1)] bg-white px-2 text-[12px] font-medium text-black hover:border-black disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ArrowLeft size={13} />
          Regresar
        </button>
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => onMove(project, "avanzar")}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-black bg-black px-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Avanzar
          <ArrowRight size={13} />
        </button>
      </div>
      {stage !== PROJECT_ETAPA_LATERAL ? (
        <button
          type="button"
          onClick={() => onMove(project, "perdido")}
          className="mt-2 min-h-9 w-full rounded-md border border-[var(--border-1)] bg-white px-2 text-[12px] font-medium text-[var(--fg-secondary)] hover:border-black hover:text-black"
        >
          Marcar perdido
        </button>
      ) : null}
    </article>
  );
}

function AltaClienteModal({
  demos,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  demos: DemoProject[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (form: AltaForm) => void;
}) {
  const [form, setForm] = useState<AltaForm>(EMPTY_ALTA);
  const [q, setQ] = useState("");
  const selected = demos.find((demo) => demo.id === form.demo_id) ?? null;
  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return demos.slice(0, 6);
    return demos
      .filter((demo) => {
        const hay = norm([
          demo.name,
          demo.description,
          demo.rubro,
          demo.cartera_nota,
          demo.primary_repo,
          ...demo.modules,
        ].filter(Boolean).join(" "));
        return words.every((word) => hay.includes(word));
      })
      .slice(0, 6);
  }, [demos, q]);

  const set = (key: keyof AltaForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
        className="grid max-h-[calc(100svh-3rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-black bg-white"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-1)] px-5 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Puerta única
            </p>
            <h2 className="mt-1 text-[22px] font-semibold text-black">Alta de cliente nuevo</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] hover:border-black"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <TextField
            label="Nombre del cliente"
            value={form.cliente_nombre}
            onChange={(value) => set("cliente_nombre", value)}
            required
          />
          <TextField
            label="Nombre del proyecto"
            value={form.project_name}
            onChange={(value) => set("project_name", value)}
            required
          />
          <TextField
            label="WhatsApp"
            value={form.cliente_whatsapp}
            onChange={(value) => set("cliente_whatsapp", value)}
            placeholder="+52..."
          />
          <TextField
            label="Rubro"
            value={form.rubro}
            onChange={(value) => set("rubro", value)}
            required
          />

          <section className="min-w-0 md:col-span-2">
            <label className="text-[12px] font-medium text-[var(--fg-muted)]">Partir de demo</label>
            <div className="mt-1 flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-1)] bg-[var(--color-background)] px-3 focus-within:border-black">
              <Search size={14} />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Buscar por nombre, rubro o módulos"
                className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--fg-muted)]"
              />
            </div>
            {selected ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-black bg-white px-3 py-2 text-[13px]">
                <span className="min-w-0 truncate">Base elegida: {selected.name}</span>
                <button
                  type="button"
                  onClick={() => set("demo_id", "")}
                  className="shrink-0 text-[12px] font-medium text-[var(--fg-muted)] hover:text-black"
                >
                  Quitar
                </button>
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {filtered.length ? (
                filtered.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => set("demo_id", demo.id)}
                    className={`min-w-0 rounded-md border px-3 py-3 text-left ${
                      form.demo_id === demo.id
                        ? "border-black bg-white"
                        : "border-[var(--border-1)] bg-white hover:border-black"
                    }`}
                  >
                    <span className="block truncate text-[13px] font-semibold text-black">{demo.name}</span>
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-5 text-[var(--fg-muted)]">
                      {demo.description || demo.cartera_nota || "Demo sin descripción capturada."}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-[var(--border-1)] px-3 py-5 text-center text-[13px] text-[var(--fg-muted)] md:col-span-2">
                  No hay demos que coincidan.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-1)] px-5 py-4 md:flex-row md:items-center md:justify-end">
          {error && !busy ? (
            <p role="alert" className="mr-auto text-[12px] text-[var(--vf-error,#ef4444)]">
              No se pudo: {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-[var(--border-1)] bg-white px-4 text-[13px] font-medium text-black hover:border-black"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-md border border-black bg-black px-4 text-[13px] font-semibold text-white disabled:opacity-45"
          >
            {busy ? "Guardando..." : "Guardar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="min-w-0">
      <span className="text-[12px] font-medium text-[var(--fg-muted)]">{label}</span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-[var(--border-1)] bg-[var(--color-background)] px-3 text-[14px] text-black outline-none placeholder:text-[var(--fg-muted)] focus:border-black"
      />
    </label>
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
          <StagePill etapa={project.etapa} />
          <HealthPill level={project.health.level} label={project.health.label} />
        </div>
        <h3 className="mt-3 break-words text-[22px] font-semibold leading-tight text-black">
          {project.name}
        </h3>
        <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
          {project.cliente_nombre ? `${project.cliente_nombre} · ` : ""}
          {estadoHumano(project.cartera_estado)} - {priorityText(project.cartera_prioridad)}
        </p>
        {project.cartera_nota ? (
          <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[var(--fg-muted)]">
            {project.cartera_nota}
          </p>
        ) : null}
        <EtapaTimelineMini project={project} />
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

function EtapaTimelineMini({ project }: { project: CarteraProject }) {
  const history = project.etapa_historial.slice(-4);
  if (!history.length) {
    return <p className="mt-3 text-[12px] text-[var(--fg-muted)]">Historial de etapa sin dato.</p>;
  }
  return (
    <div className="mt-4 flex min-w-0 flex-wrap gap-2">
      {history.map((item) => (
        <span key={item.id} className="rounded-full border border-[var(--border-1)] px-2.5 py-1 text-[11px] text-[var(--fg-secondary)]">
          {etapaLabel(item.etapa)}
        </span>
      ))}
    </div>
  );
}

function StagePill({ etapa }: { etapa: ProjectEtapa | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black px-2.5 py-1 text-[11px] font-medium text-black">
      <span className="h-2 w-2 rounded-full bg-black" />
      {etapaLabel(etapa)}
    </span>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md px-4 text-[13px] font-semibold ${
        active
          ? "border border-black bg-black text-white"
          : "border border-[var(--border-1)] bg-white text-black hover:border-black"
      }`}
    >
      {label}
    </button>
  );
}

function MiniLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-1 rounded-full border border-[var(--border-1)] px-2 py-1 text-[11px] font-medium text-black hover:border-black"
    >
      <span>{label}</span>
      <ExternalLink size={11} />
    </a>
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
    cliente_abandono: "cliente abandonó",
    cerrado_mantenimiento: "cerrado, mantenimiento",
    medio_parado: "medio parado",
    relacion_rota_no_pago: "relación rota, no pagó",
    parado_abandonado: "parado o abandonado",
    buscar_al_cliente: "buscar al cliente",
    le_quedamos_mal_dinero_devuelto: "dinero devuelto, recuperar producto",
    prospecto: "prospecto",
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

function daysInStage(project: CarteraProject) {
  const raw = project.etapa_creado_en ?? project.updated_at ?? project.created_at;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / DAY));
}

function latestEtapa(project: CarteraProject) {
  return project.etapa_historial[project.etapa_historial.length - 1] ?? null;
}

function targetForAction(
  etapa: ProjectEtapa | null,
  action: "avanzar" | "regresar" | "perdido",
): ProjectEtapa | null {
  const current = etapa ?? "prospecto";
  if (action === "perdido") return PROJECT_ETAPA_LATERAL;
  if (action === "avanzar") return nextProjectEtapa(current);
  if (current === PROJECT_ETAPA_LATERAL) return "prospecto";
  return previousProjectEtapa(current);
}

function mergeEtapa(project: CarteraProject, payload: EtapaPayload): CarteraProject {
  if (!payload.project || payload.project.id !== project.id) return project;
  const history = payload.history ?? project.etapa_historial;
  const latest = history[history.length - 1] ?? null;
  return {
    ...project,
    etapa: payload.project.etapa,
    demo_url: payload.project.demo_url,
    contrato_url: payload.project.contrato_url,
    etapa_historial: history,
    etapa_creado_en: latest?.creado_en ?? project.etapa_creado_en,
    etapa_nota: latest?.nota ?? project.etapa_nota,
    updated_at: new Date().toISOString(),
  };
}

function projectFromAlta(
  form: AltaForm,
  project: NonNullable<AltaResult["project"]>,
  now: string,
): CarteraProject {
  const repo: ProjectRepository | null = project.github_repo
    ? {
        repo_full_name: project.github_repo,
        role: "app",
        is_primary: true,
        default_branch: "main",
        private: true,
        language: null,
        html_url: project.github_url,
        pushed_at: null,
      }
    : null;
  const history: ProjectEtapaHistoryItem[] = [
    {
      id: `local-${project.id}`,
      project_id: project.id,
      etapa: "prospecto",
      nota: "Alta de cliente nuevo.",
      creado_por: null,
      creado_en: now,
    },
  ];
  return {
    id: project.id,
    name: project.name,
    description: `Rubro: ${form.rubro}`,
    category: "en_revision",
    status: "unknown",
    domain: null,
    vercel_url: null,
    cartera_tipo: ["cliente"],
    cartera_estado: "prospecto",
    cartera_prioridad: null,
    cartera_nota: `Cliente: ${form.cliente_nombre}. Rubro: ${form.rubro}.`,
    etapa: "prospecto",
    etapa_creado_en: now,
    etapa_nota: "Alta de cliente nuevo.",
    cliente_nombre: form.cliente_nombre,
    cliente_whatsapp: form.cliente_whatsapp || null,
    contrato_url: null,
    demo_url: null,
    etapa_historial: history,
    created_at: now,
    updated_at: now,
    last_push: null,
    repositories: repo ? [repo] : [],
    repository_groups: repo ? [{ label: "App", repos: [repo] }] : [],
    health: {
      level: "unknown",
      label: "sin dato",
      signals: [
        { label: "URL", level: "unknown", text: "sin URL pública" },
        { label: "Deploy", level: "unknown", text: "sin deploy" },
        { label: "Eventos", level: "unknown", text: "sin eventos" },
      ],
    },
  };
}

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
