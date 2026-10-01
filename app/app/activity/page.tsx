"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { BarraFiltros, GrupoFiltros, type OpcionFiltro } from "@/components/ui/BarraFiltros";
import {
  IconActivity,
  IconBranch,
  IconCheck,
  IconDownload,
  IconGlobe,
  IconKey,
  IconRefresh,
  IconRocket,
  IconShield,
  IconWarn,
} from "@/components/brand/VFIcons";

interface AuditEvent {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ring: number | null;
  payload: unknown;
  created_at: string;
}

type EventIcon = typeof IconActivity;

function timeAgo(iso: string) {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(elapsed)) return "fecha desconocida";
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

/**
 * Familia de cada evento. Es la misma lectura que decide el ícono, así la pastilla
 * y el ícono de la fila nunca se contradicen.
 */
type Familia = "proyectos" | "despliegues" | "secretos" | "dns" | "errores" | "completados" | "acceso" | "otros";

const FAMILIAS: { id: Familia; label: string; icon: EventIcon }[] = [
  { id: "proyectos", label: "Proyectos", icon: IconBranch },
  { id: "despliegues", label: "Despliegues", icon: IconRocket },
  { id: "secretos", label: "Secretos", icon: IconKey },
  { id: "dns", label: "DNS", icon: IconGlobe },
  { id: "errores", label: "Errores", icon: IconWarn },
  { id: "completados", label: "Completados", icon: IconCheck },
  { id: "acceso", label: "Acceso", icon: IconShield },
  { id: "otros", label: "Otros", icon: IconActivity },
];
const ICONO = Object.fromEntries(FAMILIAS.map((x) => [x.id, x.icon])) as Record<Familia, EventIcon>;

function familiaDe(action: string): Familia {
  if (action.startsWith("project.")) return "proyectos";
  if (action.includes("deploy") || action.startsWith("vercel.")) return "despliegues";
  if (action.includes("secret") || action.startsWith("vault.")) return "secretos";
  if (action.includes("dns")) return "dns";
  if (action.includes("error") || action.includes("fail")) return "errores";
  if (action.includes("ok") || action.includes("complete")) return "completados";
  if (action.includes("auth") || action.includes("seal")) return "acceso";
  return "otros";
}

function norm(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type Filtro = "todas" | Familia;

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familia, setFamilia] = useState<Filtro>("todas");
  const [q, setQ] = useState("");

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/forge/activity?limit=50", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`No se pudo leer la actividad (HTTP ${response.status}).`);
      }
      const payload = (await response.json()) as {
        events?: AuditEvent[];
        error?: string;
      };
      if (payload.error) throw new Error(payload.error);
      setEvents(Array.isArray(payload.events) ? payload.events : []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo leer la actividad.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const conFamilia = useMemo(
    () => events.map((event) => ({ event, familia: familiaDe(event.action) })),
    [events],
  );

  // Coincide con la búsqueda: acción, recurso o id, sin importar acentos ni mayúsculas.
  const porTexto = useMemo(() => {
    const palabras = norm(q).split(/\s+/).filter(Boolean);
    if (!palabras.length) return conFamilia;
    return conFamilia.filter(({ event }) => {
      const hay = norm([event.action, event.resource_type, event.resource_id].filter(Boolean).join(" "));
      return palabras.every((w) => hay.includes(w));
    });
  }, [conFamilia, q]);

  // Las pastillas cuentan sobre lo que deja la búsqueda, así el número es lo que vas a ver.
  const opciones = useMemo<OpcionFiltro<Filtro>[]>(() => {
    const n = new Map<Familia, number>();
    for (const x of porTexto) n.set(x.familia, (n.get(x.familia) ?? 0) + 1);
    return [
      { id: "todas", label: "Todas", n: porTexto.length },
      ...FAMILIAS.filter((x) => (n.get(x.id) ?? 0) > 0 || x.id === familia).map((x) => ({
        id: x.id,
        label: x.label,
        n: n.get(x.id) ?? 0,
      })),
    ];
  }, [porTexto, familia]);

  const visibles = familia === "todas" ? porTexto : porTexto.filter((x) => x.familia === familia);
  const nActivos = (familia !== "todas" ? 1 : 0) + (q.trim() ? 1 : 0);
  const limpiar = () => {
    setFamilia("todas");
    setQ("");
  };

  function exportEvents() {
    if (events.length === 0) return;
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vforge-actividad-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Registro real"
        title="Actividad."
        description="Eventos autorizados del sistema y de tus proyectos, en orden cronológico."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="btn-ghost"
            >
              <IconRefresh size={12} className={refreshing ? "animate-spin" : ""} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={exportEvents}
              disabled={events.length === 0}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-35"
            >
              <IconDownload size={12} /> Exportar JSON
            </button>
          </>
        }
      />

      {error ? (
        <div className="m-5 border border-black bg-white px-4 py-4 md:m-8">
          <p className="text-[13px] font-medium">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-[12px] underline underline-offset-4"
          >
            Volver a intentar
          </button>
        </div>
      ) : null}

      {!loading && events.length > 0 ? (
        <section className="border-b border-[var(--border-1)] bg-[#f7f7f5] px-5 py-4 md:px-8">
          <BarraFiltros
            busqueda={{
              valor: q,
              onCambio: setQ,
              placeholder: "Buscar acción, recurso o id…",
              etiqueta: "Buscar en la actividad",
            }}
            resumen={
              nActivos
                ? `${visibles.length} de ${events.length} eventos`
                : `${events.length} eventos más recientes`
            }
            activos={nActivos}
            onLimpiar={limpiar}
          >
            <GrupoFiltros etiqueta="Tipo de evento" opciones={opciones} valor={familia} onCambio={setFamilia} />
          </BarraFiltros>
        </section>
      ) : null}

      <section className="bg-white px-5 py-6 md:px-8 md:py-8">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[76px] animate-pulse border border-[var(--border-1)] bg-[#f7f7f5]"
              />
            ))}
          </div>
        ) : events.length === 0 && !error ? (
          <div className="border border-dashed border-black px-6 py-20 text-center">
            <IconActivity size={19} className="mx-auto" />
            <p className="mt-4 text-[14px] font-medium">Todavía no hay eventos.</p>
            <p className="mx-auto mt-2 max-w-md text-[12px] leading-5">
              Cuando un proyecto genere actividad autorizada aparecerá aquí; no
              llenamos la línea de tiempo con datos de demostración.
            </p>
          </div>
        ) : visibles.length === 0 && !error ? (
          <div className="border border-dashed border-[var(--border-1)] px-6 py-16 text-center">
            <p className="text-[14px] font-medium">Ningún evento coincide con estos filtros.</p>
            <button type="button" onClick={limpiar} className="btn-ghost mt-4">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <ol className="border-t border-[var(--border-1)]">
            {visibles.map(({ event, familia: fam }) => {
              const Icon = ICONO[fam];
              return (
                <li
                  key={event.id}
                  className="grid gap-3 border-b border-[var(--border-1)] py-4 sm:grid-cols-[28px_minmax(0,1fr)_110px] sm:items-start"
                >
                  <span className="grid h-7 w-7 place-items-center border border-black bg-white">
                    <Icon size={12} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{event.action}</p>
                    {event.resource_type || event.resource_id ? (
                      <p className="mt-1 truncate font-mono text-[12px] text-[var(--fg-muted)]">
                        {[event.resource_type, event.resource_id]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-[12px] text-[var(--fg-muted)]">
                        Evento de plataforma
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    {event.ring !== null ? (
                      <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                        ring {event.ring}
                      </span>
                    ) : null}
                    <time className="font-mono text-[12px] text-[var(--fg-muted)]">
                      {timeAgo(event.created_at)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
