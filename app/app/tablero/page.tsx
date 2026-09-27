"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconRefresh, IconWarn, IconChevD } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

/* ─────────────── tipos: espejo de /root/tablero/estado.py ─────────────── */

type Vivo = { pid: number; cwd: string; desde: string | null; min: number };
type Loop = {
  script: string;
  cada: string;
  worktree: string | null;
  con_tope: boolean;
  marca_fin: string | null;
  etiqueta: string | null;
};
type Commit = { cuando: string | null; msg: string };
type Must500 = {
  conteo: Record<string, number>;
  registrados?: number;
  resumen: {
    total: number;
    ok: number;
    mal: number;
    manual: number;
    luis: number;
    pendiente: number;
  } | null;
  fallas: { n: number; ev: string }[];
};
type Frente = {
  nombre: string;
  estado: "trabajando" | "en loop" | "reciente" | "terminado" | "quieto";
  brief: string | null;
  sesiones_24h: number;
  sesiones_7d: number;
  ultima_sesion: string | null;
  commits_24h: number;
  ultimo_commit: string | null;
  commits: Commit[];
  loop: Loop | null;
  intentos: number | null;
  ultimo_intento: string | null;
  fin: string[];
  corriendo: Vivo[];
  must500: Must500 | null;
};
type Estado = {
  generado: string;
  sesiones_por_dia: { dia: string; sesiones: number }[];
  sesiones_24h: number;
  claude_vivos: Vivo[];
  crons_agentes: Loop[];
  frentes: Frente[];
  fuera_de_worktrees: { donde: string; sesiones_24h: number }[];
};

/* ─────────────── utilidades ─────────────── */

const TZ = "America/Cancun";

function hace(iso: string | null, ahora: number): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (s < 60) return "hace segundos";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

function hora(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function diaCorto(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", timeZone: "UTC" })
    .format(d)
    .replace(".", "");
}

function cadaHumano(cron: string): string {
  const m = cron.match(/^\*\/(\d+) \* \* \* \*$/);
  if (m) return `cada ${m[1]} min`;
  const h = cron.match(/^(\d+) \*\/(\d+) \* \* \*$/);
  if (h) return `cada ${h[2]} h`;
  return cron;
}

// Colores fijos en hex: el tema de VForge aplana los tonos -500 de Tailwind a negro.
const C = { verde: "#16a34a", rojo: "#dc2626", azul: "#38bdf8", violeta: "#7c3aed", ambar: "#d97706", cielo: "#0284c7", gris: "#a3a3a3", grisClaro: "#d4d4d4", vacio: "#e5e5e5" };

const ESTADO_UI: Record<Frente["estado"], { label: string; dot: string; chip: string }> = {
  trabajando: { label: "Trabajando", dot: C.verde, chip: "border-emerald-600/30 bg-emerald-50 text-emerald-800" },
  "en loop": { label: "En loop", dot: C.ambar, chip: "border-amber-600/30 bg-amber-50 text-amber-900" },
  reciente: { label: "Activo hoy", dot: C.cielo, chip: "border-sky-600/30 bg-sky-50 text-sky-900" },
  terminado: { label: "Terminado", dot: C.gris, chip: "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-tertiary)]" },
  quieto: { label: "Quieto", dot: C.grisClaro, chip: "border-[var(--border-1)] bg-white text-[var(--fg-tertiary)]" },
};

/* ─────────────── página ─────────────── */

export default function TableroPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = useCallback(async (regenerar = false) => {
    if (regenerar) setRefrescando(true);
    try {
      const r = await fetch(`/api/tablero${regenerar ? "?refrescar=1" : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || `error ${r.status}`);
      setEstado(j.estado as Estado);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
      setRefrescando(false);
      setAhora(Date.now());
    }
  }, []);

  useEffect(() => {
    void cargar();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, 60_000);
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(reloj);
    };
  }, [cargar]);

  return (
    <>
      <PageHeader
        eyebrow="OPERACIÓN"
        title="Tablero"
        description="Qué están haciendo los agentes en el servidor, cuánto están gastando y qué han avanzado. Se actualiza solo cada minuto."
        actions={
          <button
            type="button"
            onClick={() => void cargar(true)}
            disabled={refrescando}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-black bg-black px-4 text-[13px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            <IconRefresh size={15} className={cn(refrescando && "animate-spin")} />
            {refrescando ? "Midiendo…" : "Medir ahora"}
          </button>
        }
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-8">
        {estado && (
          <p className="mono-label mb-5 text-[var(--fg-tertiary)]">
            Foto del servidor {hace(estado.generado, ahora)} · {hora(estado.generado)}
          </p>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-600/30 bg-red-50 px-4 py-3 text-[14px] text-red-900">
            <IconWarn size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">No pude leer el servidor</p>
              <p className="mt-0.5 text-red-800/80">{error}</p>
            </div>
          </div>
        )}

        {cargando && !estado && <Esqueleto />}

        {estado && <Contenido estado={estado} ahora={ahora} />}
      </div>
    </>
  );
}

/* ─────────────── contenido ─────────────── */

function Contenido({ estado, ahora }: { estado: Estado; ahora: number }) {
  const hoy = estado.sesiones_por_dia[estado.sesiones_por_dia.length - 1]?.sesiones ?? 0;
  const commits24 = estado.frentes.reduce((a, f) => a + f.commits_24h, 0);

  const alertas = useMemo(() => {
    const out: { titulo: string; detalle: string }[] = [];
    for (const f of estado.frentes) {
      const l = f.loop;
      if (!l || l.con_tope) continue;
      if (l.marca_fin && f.fin.includes(l.marca_fin)) continue;
      out.push({
        titulo: `${f.nombre}: loop sin tope`,
        detalle: `${l.script.replace("/root/", "")} relanza Claude Code ${cadaHumano(l.cada)} hasta que exista ${l.marca_fin ?? "una marca de fin"}. Lleva ${f.intentos ?? "?"} corridas.`,
      });
    }
    return out;
  }, [estado.frentes]);

  const must = estado.frentes.find((f) => f.must500?.resumen);

  return (
    <div className="flex flex-col gap-8">
      {alertas.length > 0 && (
        <section className="flex flex-col gap-2">
          {alertas.map((a) => (
            <div
              key={a.titulo}
              className="flex items-start gap-3 rounded-2xl border border-amber-600/30 bg-amber-50 px-4 py-3"
            >
              <IconWarn size={18} className="mt-0.5 shrink-0 text-amber-700" />
              <div className="min-w-0 text-[14px] leading-6">
                <p className="font-medium text-amber-950">{a.titulo}</p>
                <p className="text-amber-900/80">{a.detalle}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Trabajando ahora"
          valor={estado.claude_vivos.length}
          nota={estado.claude_vivos.length === 1 ? "sesión de Claude Code" : "sesiones de Claude Code"}
          vivo={estado.claude_vivos.length > 0}
        />
        <Kpi label="Sesiones hoy" valor={hoy} nota="desde las 00:00 Cancún" />
        <Kpi label="Sesiones 24 h" valor={estado.sesiones_24h} nota="todas las de Claude Code" />
        <Kpi label="Commits 24 h" valor={commits24} nota="en los frentes activos" />
      </section>

      <Barras dias={estado.sesiones_por_dia} />

      {must?.must500?.resumen && <TarjetaMust frente={must} ahora={ahora} />}

      <section>
        <Titulo>Frentes</Titulo>
        <div className="flex flex-col gap-3">
          {estado.frentes.map((f) => (
            <TarjetaFrente key={f.nombre} f={f} ahora={ahora} />
          ))}
          {estado.frentes.length === 0 && (
            <p className="text-[14px] text-[var(--fg-tertiary)]">No hay frentes con actividad en los últimos 7 días.</p>
          )}
        </div>
      </section>

      <section>
        <Titulo>Lo que lanza agentes solo</Titulo>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white">
          {estado.crons_agentes.map((c, i) => {
            const f = estado.frentes.find((x) => x.loop?.script === c.script);
            const cerrado = !!(c.marca_fin && f?.fin.includes(c.marca_fin));
            return (
              <div
                key={c.script}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3 text-[14px] sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                  i > 0 && "border-t border-[var(--border-1)]",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] text-black">{c.script.replace("/root/", "")}</p>
                  <p className="text-[13px] text-[var(--fg-tertiary)]">
                    {cadaHumano(c.cada)}
                    {c.worktree ? ` · ${c.worktree.replace("/root/worktrees/", "")}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "w-fit shrink-0 rounded-full border px-2.5 py-0.5 text-[12px]",
                    cerrado
                      ? "border-[var(--border-1)] text-[var(--fg-tertiary)]"
                      : c.con_tope
                        ? "border-emerald-600/30 bg-emerald-50 text-emerald-800"
                        : c.worktree
                          ? "border-amber-600/30 bg-amber-50 text-amber-900"
                          : "border-[var(--border-1)] text-[var(--fg-secondary)]",
                  )}
                >
                  {cerrado ? "terminó, sale en vacío" : c.con_tope ? "con tope" : c.worktree ? "sin tope" : "tarea corta"}
                </span>
              </div>
            );
          })}
          {estado.crons_agentes.length === 0 && (
            <p className="px-4 py-3 text-[14px] text-[var(--fg-tertiary)]">Ningún cron lanza agentes.</p>
          )}
        </div>
      </section>

      {estado.fuera_de_worktrees.length > 0 && (
        <section>
          <Titulo>Sesiones fuera de worktrees (24 h)</Titulo>
          <div className="flex flex-wrap gap-2">
            {estado.fuera_de_worktrees.map((x) => (
              <span
                key={x.donde}
                className="rounded-full border border-[var(--border-1)] bg-white px-3 py-1 font-mono text-[12px] text-[var(--fg-secondary)]"
              >
                /{x.donde} · {x.sesiones_24h}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────────── piezas ─────────────── */

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="mono-label mb-3 text-[var(--fg-secondary)]">{children}</h2>;
}

function Kpi({ label, valor, nota, vivo }: { label: string; valor: number; nota: string; vivo?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border-1)] bg-white p-4">
      <p className="flex items-center gap-2 text-[12px] text-[var(--fg-tertiary)]">
        {vivo && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: C.verde }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: C.verde }} />
          </span>
        )}
        {label}
      </p>
      <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.04em] text-black tabular-nums">
        {valor.toLocaleString("es-MX")}
      </p>
      <p className="mt-2 text-[12px] leading-4 text-[var(--fg-tertiary)]">{nota}</p>
    </div>
  );
}

function Barras({ dias }: { dias: { dia: string; sesiones: number }[] }) {
  const max = Math.max(1, ...dias.map((d) => d.sesiones));
  return (
    <section className="rounded-2xl border border-[var(--border-1)] bg-white p-4 md:p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="mono-label text-[var(--fg-secondary)]">Sesiones de Claude Code por día</h2>
        <span className="text-[12px] text-[var(--fg-tertiary)]">últimos 7 días</span>
      </div>
      <div className="flex h-40 items-end gap-2 md:gap-4">
        {dias.map((d, i) => {
          const h = Math.round((d.sesiones / max) * 100);
          const esHoy = i === dias.length - 1;
          return (
            <div key={d.dia} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[12px] font-medium tabular-nums text-black">{d.sesiones}</span>
              <div
                className={cn("w-full max-w-[44px] rounded-t-md", esHoy ? "bg-black" : "bg-neutral-300")}
                style={{ height: `${Math.max(h, d.sesiones ? 3 : 1)}%` }}
                title={`${d.dia}: ${d.sesiones} sesiones`}
              />
              <span className="truncate text-[11px] capitalize text-[var(--fg-tertiary)]">{diaCorto(d.dia)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TarjetaMust({ frente, ahora }: { frente: Frente; ahora: number }) {
  const [abierto, setAbierto] = useState(false);
  const m = frente.must500!;
  const r = m.resumen!;
  const pct = Math.round((r.ok / Math.max(1, r.total)) * 100);
  const segs = [
    { k: "Bien", v: r.ok, c: C.verde },
    { k: "Falla", v: r.mal, c: C.rojo },
    { k: "Revisión manual", v: r.manual, c: C.azul },
    { k: "Te toca a ti", v: r.luis, c: C.violeta },
    { k: "Pendiente", v: r.pendiente, c: C.vacio },
  ];
  return (
    <section className="rounded-2xl border border-black bg-white p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mono-label text-[var(--fg-tertiary)]">MUST-500 · {frente.nombre}</p>
          <p className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.05em] text-black tabular-nums">
            {pct}%
          </p>
          <p className="mt-2 text-[14px] text-[var(--fg-secondary)]">
            {r.ok} de {r.total} puntos pasan · faltan {r.pendiente} por auditar
          </p>
        </div>
        <p className="text-[12px] text-[var(--fg-tertiary)]">Último avance {hace(frente.ultimo_commit, ahora)}</p>
      </div>

      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        {segs.map((s) =>
          s.v > 0 ? (
            <div key={s.k} style={{ width: `${(s.v / r.total) * 100}%`, backgroundColor: s.c }} title={`${s.k}: ${s.v}`} />
          ) : null,
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segs.map((s) => (
          <span key={s.k} className="flex items-center gap-1.5 text-[12px] text-[var(--fg-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.c }} />
            {s.k} <b className="font-semibold tabular-nums text-black">{s.v}</b>
          </span>
        ))}
      </div>

      {m.fallas.length > 0 && (
        <div className="mt-5 border-t border-[var(--border-1)] pt-4">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="flex w-full items-center justify-between text-left text-[14px] font-medium text-black"
            aria-expanded={abierto}
          >
            Qué está fallando ({r.mal})
            <IconChevD size={16} className={cn("transition", abierto && "rotate-180")} />
          </button>
          {abierto && (
            <ul className="mt-3 flex flex-col gap-2">
              {m.fallas.map((x) => (
                <li key={x.n} className="rounded-xl bg-red-50/60 px-3 py-2 text-[13px] leading-5 text-[var(--fg-secondary)]">
                  <b className="font-mono text-red-800">§{x.n}</b> {x.ev}
                </li>
              ))}
              {r.mal > m.fallas.length && (
                <li className="text-[12px] text-[var(--fg-tertiary)]">
                  y {r.mal - m.fallas.length} más en qa/m8/must500.json
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function TarjetaFrente({ f, ahora }: { f: Frente; ahora: number }) {
  const [abierto, setAbierto] = useState(false);
  const ui = ESTADO_UI[f.estado];
  const corriendo = f.corriendo[0];
  return (
    <article className="rounded-2xl border border-[var(--border-1)] bg-white">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full flex-col gap-3 p-4 text-left md:flex-row md:items-center md:justify-between md:gap-6"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-semibold tracking-[-0.02em] text-black">{f.nombre}</span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]", ui.chip)}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ui.dot }} />
              {ui.label}
              {corriendo ? ` · ${corriendo.min} min` : ""}
            </span>
          </div>
          {f.brief && <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[var(--fg-secondary)]">{f.brief}</p>}
        </div>
        <div className="flex items-center gap-5 text-[12px] text-[var(--fg-tertiary)]">
          <Dato n={f.sesiones_24h} t="sesiones 24 h" />
          <Dato n={f.commits_24h} t="commits 24 h" />
          {f.intentos != null && <Dato n={f.intentos} t="corridas" />}
          <IconChevD size={16} className={cn("shrink-0 transition", abierto && "rotate-180")} />
        </div>
      </button>
      {abierto && (
        <div className="border-t border-[var(--border-1)] px-4 pb-4 pt-3">
          <p className="mb-3 text-[12px] text-[var(--fg-tertiary)]">
            Última sesión {hace(f.ultima_sesion, ahora)} · {f.sesiones_7d} sesiones en 7 días
            {f.fin.length > 0 ? ` · marca de fin: ${f.fin.join(", ")}` : ""}
          </p>
          {f.commits.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {f.commits.map((c, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-5">
                  <span className="w-24 shrink-0 tabular-nums text-[var(--fg-tertiary)]">{hora(c.cuando)}</span>
                  <span className="min-w-0 text-[var(--fg-secondary)]">{c.msg}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--fg-tertiary)]">Sin commits.</p>
          )}
        </div>
      )}
    </article>
  );
}

function Dato({ n, t }: { n: number; t: string }) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <b className="text-[16px] font-semibold tabular-nums text-black">{n.toLocaleString("es-MX")}</b>
      <span className="whitespace-nowrap">{t}</span>
    </span>
  );
}

function Esqueleto() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Cargando tablero">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[var(--surface-1)]" />
        ))}
      </div>
      <div className="h-52 rounded-2xl bg-[var(--surface-1)]" />
      <div className="h-40 rounded-2xl bg-[var(--surface-1)]" />
    </div>
  );
}
