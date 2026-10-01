"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectChats } from "@/components/hilo/ProjectChats";
import {
  IconCheck,
  IconChats,
  IconRefresh,
  IconWarn,
} from "@/components/brand/VFIcons";
import type {
  HiloDashboardData,
  HiloHallazgo,
  HiloLinea,
  HiloLineaEstado,
  HiloMensaje,
  HiloTipoHallazgo,
} from "@/lib/hilo/types";
import { cn } from "@/lib/utils";

type Props = {
  initialData: HiloDashboardData;
};

const LINEAS: Array<{ id: HiloLinea; label: string }> = [
  { id: "personal", label: "Personal" },
  { id: "negocio", label: "Negocio" },
];

const TIPOS: Array<{ id: HiloTipoHallazgo; label: string }> = [
  { id: "pendiente", label: "Pendientes" },
  { id: "oportunidad", label: "Oportunidades" },
  { id: "riesgo", label: "Riesgos" },
];

function formatTime(value: string | null | undefined) {
  if (!value) return "sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function estadoLabel(estado: HiloLineaEstado | undefined) {
  if (!estado) return "Sin servicio";
  if (estado.estado === "conectado") return "Conectada";
  if (estado.estado === "esperando_qr") return "Esperando QR";
  return "Reconectando";
}

function emptyEstado(linea: HiloLinea): HiloLineaEstado {
  return {
    linea,
    conectado: false,
    estado: "reconectando",
    hook: "none",
    degradado: false,
    motivo_degradado: null,
    ultimo_mensaje: null,
    ultimo_error: null,
    qr_disponible: false,
    updated_at: new Date().toISOString(),
  };
}

export function HiloPanel({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [project, setProject] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [qrVersion, setQrVersion] = useState(Date.now());

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const suffix = project ? `?project=${encodeURIComponent(project)}` : "";
      const response = await fetch(`/api/hilo${suffix}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = (await response.json()) as HiloDashboardData;
      setData(next);
      setQrVersion(Date.now());
    } finally {
      if (manual) setRefreshing(false);
    }
  }, [project]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const mensajesPorLinea = useMemo(() => {
    const map = new Map<HiloLinea, HiloMensaje[]>();
    for (const linea of LINEAS) map.set(linea.id, []);
    for (const mensaje of data.mensajes) {
      if (mensaje.linea) map.get(mensaje.linea)?.push(mensaje);
    }
    return map;
  }, [data.mensajes]);

  const hallazgosPorTipo = useMemo(() => {
    const map = new Map<HiloTipoHallazgo, HiloHallazgo[]>();
    for (const tipo of TIPOS) map.set(tipo.id, []);
    for (const hallazgo of data.hallazgos) {
      map.get(hallazgo.tipo)?.push(hallazgo);
    }
    return map;
  }, [data.hallazgos]);

  const serviceProblem = (data.service.active && !data.service.ok) || !data.db.ok;

  return (
    <div className="min-h-full bg-[var(--color-background)]">
      <header className="border-b border-[var(--border-1)] bg-white px-5 py-7 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase text-[var(--fg-muted)]">
              Hilo
            </p>
            <h1 className="mt-3 text-[44px] font-semibold leading-none tracking-normal text-black md:text-[64px]">
              WhatsApp privado.
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-6 text-[var(--fg-secondary)]">
              Dos lineas vivas, mensajes recientes y hallazgos del analista batch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="h-11 rounded-md border border-[var(--border-1)] bg-white px-3 text-[13px]"
              aria-label="Filtrar hallazgos por proyecto"
            >
              <option value="">Todos los proyectos</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconRefresh size={13} className={refreshing ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {serviceProblem ? (
        <section className="border-b border-[var(--border-1)] bg-white px-5 py-4 md:px-8">
          <div className="flex items-start gap-3 border border-black px-4 py-3">
            <IconWarn size={16} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-5 text-black">
              {data.service.error ?? data.db.error ?? "Hilo no esta disponible."}
            </p>
          </div>
        </section>
      ) : null}

      <ProjectChats
        projectId={project || null}
        initialChats={project ? data.chats : []}
        liveActive={data.service.active}
      />

      {data.service.active ? (
        <section className="grid border-b border-[var(--border-1)] bg-[var(--color-background)] lg:grid-cols-2">
          {LINEAS.map(({ id, label }) => {
            const estado = data.service.lineas?.[id] ?? emptyEstado(id);
            return (
              <LineStatus
                key={id}
                label={label}
                estado={estado}
                qrVersion={qrVersion}
              />
            );
          })}
        </section>
      ) : null}

      <section className="grid border-b border-[var(--border-1)] bg-white lg:grid-cols-2">
        {LINEAS.map(({ id, label }) => (
          <MessagesColumn
            key={id}
            label={label}
            mensajes={mensajesPorLinea.get(id) ?? []}
          />
        ))}
      </section>

      <section className="grid gap-px bg-[var(--border-1)] md:grid-cols-3">
        {TIPOS.map(({ id, label }) => (
          <FindingColumn
            key={id}
            label={label}
            tipo={id}
            hallazgos={hallazgosPorTipo.get(id) ?? []}
          />
        ))}
      </section>
    </div>
  );
}

function LineStatus({
  label,
  estado,
  qrVersion,
}: {
  label: string;
  estado: HiloLineaEstado;
  qrVersion: number;
}) {
  const waitingQr = estado.estado === "esperando_qr" && estado.qr_disponible;
  return (
    <article className="border-b border-[var(--border-1)] bg-white p-5 lg:border-b-0 lg:border-r lg:last:border-r-0 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] uppercase text-[var(--fg-muted)]">
            {label}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <StatusDot estado={estado.estado} />
            <h2 className="text-[22px] font-medium tracking-normal">
              {estadoLabel(estado)}
            </h2>
          </div>
        </div>
        <span className="rounded-full border border-[var(--border-1)] px-3 py-1 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
          {estado.hook}
        </span>
      </div>

      {waitingQr ? (
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="border border-black bg-white p-3">
            <Image
              src={`/api/hilo/qr/${estado.linea}?v=${qrVersion}`}
              alt={`QR ${label}`}
              width={192}
              height={192}
              unoptimized
              className="h-48 w-48"
            />
          </div>
          <p className="max-w-sm text-[13px] leading-5 text-[var(--fg-secondary)]">
            Vincula esta linea desde WhatsApp en el telefono de Luis.
          </p>
        </div>
      ) : null}

      {estado.ultimo_mensaje ? (
        <div className="mt-5 border border-[var(--border-1)] px-4 py-3">
          <p className="text-[12px] font-medium text-black">
            {estado.ultimo_mensaje.chat_nombre ?? estado.ultimo_mensaje.chat_id}
          </p>
          <p className="mt-1 break-words text-[13px] leading-5 text-[var(--fg-secondary)]">
            {estado.ultimo_mensaje.texto ?? estado.ultimo_mensaje.tipo}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
            {formatTime(estado.ultimo_mensaje.ts)}
          </p>
        </div>
      ) : null}

      {estado.degradado ? (
        <p className="mt-4 text-[12px] leading-5 text-[var(--fg-muted)]">
          Modo degradado: {estado.motivo_degradado}
        </p>
      ) : null}
      {estado.ultimo_error ? (
        <p className="mt-4 text-[12px] leading-5 text-black">
          {estado.ultimo_error}
        </p>
      ) : null}
    </article>
  );
}

function StatusDot({ estado }: { estado: HiloLineaEstado["estado"] }) {
  return (
    <span
      className={cn(
        "h-2.5 w-2.5 rounded-full",
        estado === "conectado"
          ? "bg-black"
          : estado === "esperando_qr"
            ? "bg-[var(--accent)]"
            : "bg-[var(--fg-muted)]",
      )}
      aria-hidden="true"
    />
  );
}

function MessagesColumn({ label, mensajes }: { label: string; mensajes: HiloMensaje[] }) {
  return (
    <div className="border-b border-[var(--border-1)] p-5 lg:border-b-0 lg:border-r lg:last:border-r-0 md:p-8">
      <div className="flex items-center gap-2">
        <IconChats size={15} />
        <h2 className="text-[18px] font-medium tracking-normal">{label}</h2>
      </div>
      <div className="mt-5 space-y-3">
        {mensajes.length === 0 ? (
          <EmptyLine text="Sin mensajes recientes." />
        ) : (
          mensajes.slice(0, 12).map((mensaje) => (
            <article
              key={mensaje.uid}
              className="border border-[var(--border-1)] bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-black">
                    {mensaje.chat_nombre ?? mensaje.chat_id}
                  </p>
                  <p className="mt-1 break-words text-[13px] leading-5 text-[var(--fg-secondary)]">
                    {mensaje.texto || mensaje.media_tipo || mensaje.tipo}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
                  {mensaje.de_mi ? "Luis" : mensaje.tipo}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
                {formatTime(mensaje.ts)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function FindingColumn({
  label,
  tipo,
  hallazgos,
}: {
  label: string;
  tipo: HiloTipoHallazgo;
  hallazgos: HiloHallazgo[];
}) {
  return (
    <div className="bg-white p-5 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-medium tracking-normal">{label}</h2>
        <span className="rounded-full border border-[var(--border-1)] px-2 py-1 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
          {hallazgos.length}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {hallazgos.length === 0 ? (
          <EmptyLine text={`Sin ${label.toLowerCase()}.`} />
        ) : (
          hallazgos.slice(0, 10).map((hallazgo) => (
            <article key={hallazgo.id} className="border border-[var(--border-1)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-[13px] font-medium text-black">
                    {hallazgo.titulo}
                  </p>
                  {hallazgo.detalle ? (
                    <p className="mt-2 break-words text-[12px] leading-5 text-[var(--fg-secondary)]">
                      {hallazgo.detalle}
                    </p>
                  ) : null}
                </div>
                {hallazgo.importante ? <IconWarn size={14} className="shrink-0" /> : <IconCheck size={14} className="shrink-0" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge text={hallazgo.prioridad} hot={hallazgo.prioridad === "alta" || hallazgo.prioridad === "critica" || tipo === "riesgo"} />
                <Badge text={hallazgo.project_name ?? hallazgo.project_id ?? "sin proyecto"} />
                <Badge text={hallazgo.chat_clase} />
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
                {formatTime(hallazgo.created_at)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Badge({ text, hot = false }: { text: string; hot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-1 font-mono text-[11px] uppercase",
        hot
          ? "border-black bg-black text-white"
          : "border-[var(--border-1)] text-[var(--fg-muted)]",
      )}
    >
      {text}
    </span>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-[var(--border-1)] px-4 py-8 text-center">
      <p className="text-[13px] text-[var(--fg-muted)]">{text}</p>
    </div>
  );
}
