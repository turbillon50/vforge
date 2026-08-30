"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
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

function iconFor(action: string): EventIcon {
  if (action.startsWith("project.")) return IconBranch;
  if (action.includes("deploy") || action.startsWith("vercel.")) return IconRocket;
  if (action.includes("secret") || action.startsWith("vault.")) return IconKey;
  if (action.includes("dns")) return IconGlobe;
  if (action.includes("error") || action.includes("fail")) return IconWarn;
  if (action.includes("ok") || action.includes("complete")) return IconCheck;
  if (action.includes("auth") || action.includes("seal")) return IconShield;
  return IconActivity;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        ) : (
          <ol className="border-t border-[var(--border-1)]">
            {events.map((event) => {
              const Icon = iconFor(event.action);
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
                      <p className="mt-1 truncate font-mono text-[9px] text-[var(--fg-muted)]">
                        {[event.resource_type, event.resource_id]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-[9px] text-[var(--fg-muted)]">
                        Evento de plataforma
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    {event.ring !== null ? (
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                        ring {event.ring}
                      </span>
                    ) : null}
                    <time className="font-mono text-[9px] text-[var(--fg-muted)]">
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
