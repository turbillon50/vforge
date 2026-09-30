"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconRefresh,
  IconWarn,
  IconChevD,
  IconInfo,
  IconCheck,
} from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

/* ───────────── tipos: espejo de servidor/tablero/estado.py ───────────── */

type Vivo = { pid: number; cwd: string; desde: string | null; min: number };
type Commit = { cuando: string | null; msg: string };
type Avance = {
  pct: number | null;
  hechos?: number;
  total?: number;
  archivo?: string;
  bloque_actual?: string | null;
  pendiente?: string | null;
  motivo?: string;
};
type Tokens = {
  entrada: number;
  salida: number;
  cache_nuevo: number;
  cache_leido: number;
  mensajes: number;
  total: number;
};
type Lanzador = {
  tipo: string;
  ref: string;
  cada: string;
  activo: boolean;
  supervisado: boolean;
};
type Frente = {
  tag: string;
  nombre: string;
  worktree: string;
  proyecto: string;
  rama: string | null;
  brief: string | null;
  modelo: string | null;
  estado: string;
  nota: string | null;
  sin_freno: boolean;
  supervisado: boolean;
  avance: Avance;
  corridas_hoy: number | null;
  tope_dia: number | null;
  min_trabajando: number | null;
  corriendo: Vivo[];
  commits: Commit[];
  ultimo_commit: string | null;
  lanzadores: Lanzador[];
  ultimo_supervisor: string | null;
  marcas: string[];
  marcas_mias: string[];
  tokens_hoy: Tokens;
  tokens_7d: Tokens;
};
type Alerta = { nivel: string; clave: string; titulo: string; detalle: string };
type Bitacora = {
  cuando?: string;
  accion?: string;
  tag?: string;
  quien?: string;
  ok?: boolean;
  detalle?: string;
  crudo?: string;
};
type Estado = {
  generado: string;
  alertas: Alerta[];
  frentes: Frente[];
  consumo: {
    por_dia: (Tokens & { dia: string })[];
    ranking: {
      tag: string;
      nombre: string;
      tokens_7d: number;
      tokens_hoy: number;
      pct_semana: number;
    }[];
    fuera_de_frentes: { donde: string; tokens_7d: Tokens }[];
    modelos: [string, number][];
    total_7d: number;
    total_hoy: number;
  };
  salud: {
    disco: { libre_gb: number; pct: number; alerta: boolean };
    memoria: {
      ram?: { pct: number; total: number; usado: number };
      swap?: { pct: number; total: number; usado: number };
    };
    carga: number[] | null;
    servicios_caidos: { unidad: string; detalle: string }[];
    claude_vivos: number;
    crons_supervisor: {
      ref: string;
      cada: string;
      tag: string;
      supervisado: boolean;
      activo: boolean;
    }[];
    barrido: string | null;
    limite_cuenta: { hasta: string; min: number } | null;
  };
  bitacora: Bitacora[];
};

/* ───────────────────────────── utilidades ───────────────────────────── */

const TZ = "America/Cancun";
const ACCIONES = ["pausar", "reanudar", "detener", "relanzar"] as const;
type Accion = (typeof ACCIONES)[number];

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
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  })
    .format(d)
    .replace(".", "");
}

/** 8_840_373_235 → "8.8 MM". Los tokens se leen de un vistazo o no se leen. */
function tk(n: number): string {
  if (!n) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} MM`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(n);
}

function duracion(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

// Colores fijos en hex: el tema de VForge aplana los tonos -500 de Tailwind a negro.
const C = {
  verde: "#16a34a",
  rojo: "#dc2626",
  azul: "#38bdf8",
  violeta: "#7c3aed",
  ambar: "#d97706",
  cielo: "#0284c7",
  gris: "#a3a3a3",
  grisClaro: "#d4d4d4",
  vacio: "#e5e5e5",
};

const ESTADO_UI: Record<string, { label: string; dot: string; chip: string }> = {
  trabajando: {
    label: "Trabajando",
    dot: C.verde,
    chip: "border-emerald-600/30 bg-emerald-50 text-emerald-800",
  },
  atorado: {
    label: "Atorado",
    dot: C.rojo,
    chip: "border-red-600/30 bg-red-50 text-red-900",
  },
  "pausado por límite": {
    label: "Pausado: topó la cuenta",
    dot: C.ambar,
    chip: "border-amber-600/30 bg-amber-50 text-amber-900",
  },
  pausado: {
    label: "Pausado",
    dot: C.ambar,
    chip: "border-amber-600/30 bg-amber-50 text-amber-900",
  },
  "detenido por ti": {
    label: "Detenido por ti",
    dot: C.violeta,
    chip: "border-violet-600/30 bg-violet-50 text-violet-900",
  },
  "en espera": {
    label: "En espera",
    dot: C.cielo,
    chip: "border-sky-600/30 bg-sky-50 text-sky-900",
  },
  terminado: {
    label: "Terminado",
    dot: C.gris,
    chip: "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-tertiary)]",
  },
  quieto: {
    label: "Quieto",
    dot: C.grisClaro,
    chip: "border-[var(--border-1)] bg-white text-[var(--fg-tertiary)]",
  },
};

function ui(estado: string) {
  return ESTADO_UI[estado] ?? ESTADO_UI.quieto;
}

// 44 px de alto: es el mínimo que un dedo acierta en el teléfono.
const BOTON =
  "inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium transition disabled:opacity-50";

/* ─────────────────────────────── página ─────────────────────────────── */

export default function TableroPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async (regenerar = false) => {
    if (regenerar) setRefrescando(true);
    try {
      const r = await fetch(`/api/tablero${regenerar ? "?refrescar=1" : ""}`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || `error ${r.status}`);
      setEstado(j.estado as Estado);
      setError(null);
      // de paso, que salgan al teléfono los avisos que falten
      void fetch("/api/tablero/avisos", { cache: "no-store" }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
      setRefrescando(false);
      setAhora(Date.now());
    }
  }, []);

  const mandar = useCallback(
    async (accion: Accion, tag: string) => {
      setAviso(null);
      try {
        const r = await fetch("/api/tablero/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion, tag }),
        });
        const j = await r.json();
        setAviso({
          ok: !!j.ok,
          texto: j.ok ? j.mensaje : j.error || j.mensaje || "no se pudo",
        });
        await cargar();
      } catch (e) {
        setAviso({ ok: false, texto: e instanceof Error ? e.message : String(e) });
      }
    },
    [cargar],
  );

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
    // El 12 px mínimo se aplica a TODO lo que cuelga de esta pantalla, incluido
    // el `mono-label` de 10 px que trae PageHeader. Va como variante sobre el
    // contenedor y no tocando PageHeader, que es de toda la app (y de otro frente).
    <div className="[&_.mono-label]:!text-[12px]">
      <PageHeader
        eyebrow="OPERACIÓN"
        title="Centro de mando"
        description="Qué se está haciendo en el servidor, cuánto ha avanzado, qué se está comiendo la cuenta y cómo va el Hetzner. Se mide solo cada 5 minutos."
        actions={
          <button
            type="button"
            onClick={() => void cargar(true)}
            disabled={refrescando}
            className={cn(BOTON, "border border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]")}
          >
            <IconRefresh size={15} className={cn(refrescando && "animate-spin")} />
            {refrescando ? "Midiendo…" : "Medir ahora"}
          </button>
        }
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-8">
        {estado && (
          <p className={cn(ETIQUETA, "mb-5 text-[var(--fg-tertiary)]")}>
            Foto del servidor {hace(estado.generado, ahora)} · {hora(estado.generado)}
          </p>
        )}

        {aviso && (
          <div
            className={cn(
              "mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[14px]",
              aviso.ok
                ? "border-emerald-600/30 bg-emerald-50 text-emerald-900"
                : "border-red-600/30 bg-red-50 text-red-900",
            )}
          >
            {aviso.ok ? (
              <IconCheck size={18} className="mt-0.5 shrink-0" />
            ) : (
              <IconWarn size={18} className="mt-0.5 shrink-0" />
            )}
            <p className="min-w-0 break-words">{aviso.texto}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-600/30 bg-red-50 px-4 py-3 text-[14px] text-red-900">
            <IconWarn size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">No pude leer el servidor</p>
              <p className="mt-0.5 break-words text-red-800/80">{error}</p>
            </div>
          </div>
        )}

        {cargando && !estado && <Esqueleto />}
        {estado && <Contenido estado={estado} ahora={ahora} mandar={mandar} />}
      </div>
    </div>
  );
}

/* ───────────────────────────── contenido ───────────────────────────── */

function Contenido({
  estado,
  ahora,
  mandar,
}: {
  estado: Estado;
  ahora: number;
  mandar: (a: Accion, t: string) => Promise<void>;
}) {
  const { activos, dormidos } = useMemo(() => {
    const vivos = new Set(["trabajando", "atorado", "pausado", "pausado por límite", "detenido por ti", "en espera"]);
    return {
      activos: estado.frentes.filter((f) => vivos.has(f.estado)),
      dormidos: estado.frentes.filter((f) => !vivos.has(f.estado)),
    };
  }, [estado.frentes]);

  const trabajando = estado.frentes.filter((f) => f.estado === "trabajando").length;
  const conLista = estado.frentes.filter((f) => f.avance.pct != null);

  return (
    <div className="flex flex-col gap-8">
      {estado.alertas.length > 0 && (
        <section className="flex flex-col gap-2">
          {estado.alertas.map((a) => (
            <Alerta key={a.clave} a={a} />
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Trabajando ahora"
          valor={String(trabajando)}
          nota={trabajando === 1 ? "frente con Claude vivo" : "frentes con Claude vivo"}
          vivo={trabajando > 0}
        />
        <Kpi
          label="Frentes vivos"
          valor={String(activos.length)}
          nota={`${dormidos.length} más quietos o cerrados`}
        />
        <Kpi
          label="Tokens hoy"
          valor={tk(estado.consumo.total_hoy)}
          nota={`${tk(estado.consumo.total_7d)} en 7 días`}
        />
        <Kpi
          label="Disco libre"
          valor={`${estado.salud.disco?.libre_gb ?? "?"} GB`}
          nota={estado.salud.disco?.alerta ? "por debajo de 5 GB" : `${estado.salud.disco?.pct ?? "?"}% usado`}
          alerta={estado.salud.disco?.alerta}
        />
      </section>

      <section>
        <Titulo>
          Frentes vivos
          {conLista.length > 0 && (
            <span className="ml-2 font-normal normal-case text-[var(--fg-tertiary)]">
              · {conLista.length} de {estado.frentes.length} se pueden medir
            </span>
          )}
        </Titulo>
        <div className="flex flex-col gap-3">
          {activos.map((f) => (
            <TarjetaFrente key={f.tag} f={f} ahora={ahora} mandar={mandar} />
          ))}
          {activos.length === 0 && (
            <p className="text-[14px] text-[var(--fg-tertiary)]">
              Ningún frente activo ahora mismo.
            </p>
          )}
        </div>
      </section>

      <Consumo estado={estado} />

      <Salud salud={estado.salud} />

      {dormidos.length > 0 && (
        <section>
          <Titulo>Quietos y cerrados</Titulo>
          <div className="flex flex-col gap-3">
            {dormidos.map((f) => (
              <TarjetaFrente key={f.tag} f={f} ahora={ahora} mandar={mandar} />
            ))}
          </div>
        </section>
      )}

      {estado.bitacora.length > 0 && (
        <section>
          <Titulo>Lo que has hecho desde aquí</Titulo>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white">
            {estado.bitacora.slice(0, 12).map((b, i) => (
              <div
                key={`${b.cuando}-${i}`}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3 text-[13px] sm:flex-row sm:items-baseline sm:gap-4",
                  i > 0 && "border-t border-[var(--border-1)]",
                )}
              >
                <span className="shrink-0 tabular-nums text-[var(--fg-tertiary)]">
                  {hora(b.cuando ?? null)}
                </span>
                <span className="min-w-0 break-words text-[var(--fg-secondary)]">
                  {b.crudo ? (
                    b.crudo
                  ) : (
                    <>
                      <b className="font-semibold text-black">{b.accion}</b> {b.tag}
                      {b.detalle ? ` · ${b.detalle}` : ""}
                      {b.quien ? ` · ${b.quien}` : ""}
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────── piezas ─────────────────────────────── */

// `mono-label` de la marca viene a 10 px. El tamaño de marca no se toca, pero en
// esta pantalla Luis lee desde el teléfono: aquí se sube a 12 px, que es el
// mínimo legible, sin cambiar familia, color ni espaciado.
// `!` a propósito: `.mono-label` vive en globals.css después de las utilidades
// de Tailwind, así que sin `!important` gana ella y el 12 px no se aplica.
const ETIQUETA = "mono-label !text-[12px]";

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className={cn(ETIQUETA, "mb-3 text-[var(--fg-secondary)]")}>{children}</h2>;
}

function Alerta({ a }: { a: Alerta }) {
  const alto = a.nivel === "alto";
  const info = a.nivel === "info";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3",
        alto
          ? "border-red-600/30 bg-red-50"
          : info
            ? "border-sky-600/30 bg-sky-50"
            : "border-amber-600/30 bg-amber-50",
      )}
    >
      {info ? (
        <IconInfo size={18} className="mt-0.5 shrink-0 text-sky-700" />
      ) : (
        <IconWarn
          size={18}
          className={cn("mt-0.5 shrink-0", alto ? "text-red-700" : "text-amber-700")}
        />
      )}
      <div className="min-w-0 text-[14px] leading-6">
        <p
          className={cn(
            "font-medium",
            alto ? "text-red-950" : info ? "text-sky-950" : "text-amber-950",
          )}
        >
          {a.titulo}
        </p>
        <p
          className={cn(
            "break-words",
            alto ? "text-red-900/80" : info ? "text-sky-900/80" : "text-amber-900/80",
          )}
        >
          {a.detalle}
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  valor,
  nota,
  vivo,
  alerta,
}: {
  label: string;
  valor: string;
  nota: string;
  vivo?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4",
        alerta ? "border-red-600/40" : "border-[var(--border-1)]",
      )}
    >
      <p className="flex items-center gap-2 text-[12px] text-[var(--fg-tertiary)]">
        {vivo && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: C.verde }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: C.verde }}
            />
          </span>
        )}
        <span className="min-w-0 truncate">{label}</span>
      </p>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.04em] text-black tabular-nums md:text-[34px]">
        {valor}
      </p>
      <p className="mt-2 text-[12px] leading-4 text-[var(--fg-tertiary)]">{nota}</p>
    </div>
  );
}

/** La barra de avance. Sin lista no hay barra: hay una frase que dice por qué. */
function Avance({ a }: { a: Avance }) {
  if (a.pct == null) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-1)] px-3 py-2">
        <p className="text-[12px] leading-5 text-[var(--fg-tertiary)]">
          {a.motivo ?? "sin lista: no se puede medir avance"}
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-[var(--fg-secondary)]">
          {a.hechos} de {a.total} puntos
          {a.archivo ? (
            <span className="text-[var(--fg-tertiary)]"> · {a.archivo}</span>
          ) : null}
        </span>
        <span className="text-[18px] font-semibold tabular-nums text-black">{a.pct}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${a.pct}%`, backgroundColor: a.pct >= 100 ? C.verde : "#000" }}
        />
      </div>
      {a.bloque_actual && a.pct < 100 && (
        <p className="mt-2 text-[12px] leading-5 text-[var(--fg-tertiary)]">
          Va en <b className="font-medium text-[var(--fg-secondary)]">{a.bloque_actual}</b>
          {a.pendiente ? ` — sigue: ${a.pendiente}` : ""}
        </p>
      )}
    </div>
  );
}

function TarjetaFrente({
  f,
  ahora,
  mandar,
}: {
  f: Frente;
  ahora: number;
  mandar: (a: Accion, t: string) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState<Accion | null>(null);
  const u = ui(f.estado);

  const puede = (a: Accion) => {
    if (a === "pausar" || a === "detener") return f.estado === "trabajando" || f.estado === "en espera";
    // solo cuentan las marcas de ESTE tag: un worktree arrastra las de otros
    if (a === "reanudar") return f.marcas_mias.includes(`PAUSA-${f.tag}`);
    return (
      f.marcas_mias.includes(`PAUSA-${f.tag}`) ||
      f.marcas_mias.includes(`STALLED-${f.tag}`)
    );
  };

  const click = async (a: Accion) => {
    setOcupado(a);
    try {
      await mandar(a, f.tag);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border-1)] bg-white">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full flex-col gap-3 p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-black">
                {f.tag}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]",
                  u.chip,
                )}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: u.dot }}
                />
                {u.label}
                {f.min_trabajando != null ? ` · ${duracion(f.min_trabajando)}` : ""}
              </span>
              {f.sin_freno && (
                <span className="rounded-full border border-red-600/30 bg-red-50 px-2.5 py-0.5 text-[12px] text-red-900">
                  sin freno
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
              {f.proyecto}
              {f.rama ? ` · ${f.rama}` : ""}
              {f.modelo ? ` · ${f.modelo}` : ""}
            </p>
            {f.brief && (
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[var(--fg-secondary)]">
                {f.brief}
              </p>
            )}
          </div>
          <IconChevD
            size={16}
            className={cn("mt-1 shrink-0 text-[var(--fg-tertiary)] transition", abierto && "rotate-180")}
          />
        </div>

        <Avance a={f.avance} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[var(--fg-tertiary)]">
          <span>
            <b className="text-[13px] font-semibold text-black tabular-nums">
              {f.corridas_hoy ?? "—"}
              {f.tope_dia ? `/${f.tope_dia}` : ""}
            </b>{" "}
            corridas hoy
          </span>
          <span>
            <b className="text-[13px] font-semibold text-black tabular-nums">
              {tk(f.tokens_hoy.total)}
            </b>{" "}
            tokens hoy
          </span>
          <span>último commit {hace(f.ultimo_commit, ahora)}</span>
        </div>
      </button>

      {f.nota && (
        <p className="border-t border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2 text-[12px] leading-5 text-[var(--fg-secondary)]">
          {f.nota}
        </p>
      )}

      {/* Un frente quieto o cerrado no admite ninguna de las cuatro: pintar
          cuatro botones muertos solo alarga la pantalla en el teléfono. */}
      {ACCIONES.some(puede) && (
      <div className="flex flex-wrap gap-2 border-t border-[var(--border-1)] px-4 py-3">
        {ACCIONES.map((a) => {
          const activo = puede(a);
          return (
          <button
            key={a}
            type="button"
            disabled={!activo || ocupado !== null}
            onClick={() => void click(a)}
            className={cn(
              BOTON,
              "border",
              // Apagado siempre se ve apagado. Un "Relanzar" negro al 50% sigue
              // leyéndose como el botón principal aunque no se pueda tocar.
              !activo
                ? "border-[var(--border-1)] bg-white text-[var(--fg-tertiary)]"
                : a === "detener"
                  ? "border-red-600/40 bg-white text-red-800 hover:bg-red-50"
                  : a === "relanzar"
                    ? "border-black bg-black text-white hover:bg-neutral-800"
                    : "border-[var(--border-1)] bg-white text-[var(--fg-secondary)] hover:bg-[var(--surface-1)]",
            )}
          >
            {ocupado === a && <IconRefresh size={14} className="animate-spin" />}
            {a[0].toUpperCase() + a.slice(1)}
          </button>
          );
        })}
      </div>
      )}

      {abierto && (
        <div className="border-t border-[var(--border-1)] px-4 pb-4 pt-3">
          <dl className="mb-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            <Dato k="Worktree" v={f.worktree} />
            <Dato k="Tokens 7 días" v={`${tk(f.tokens_7d.total)} · ${f.tokens_7d.mensajes} mensajes`} />
            <Dato
              k="Freno"
              v={
                f.supervisado
                  ? "vl-supervisor (tope diario + pausa por límite)"
                  : f.lanzadores.length
                    ? "ninguno: no pasa por vl-supervisor"
                    : "no lo relanza nadie"
              }
            />
            <Dato
              k="Lo relanza"
              v={
                f.lanzadores.length
                  ? f.lanzadores.map((l) => `${l.ref} (${l.cada})`).join(", ")
                  : "nadie"
              }
            />
            {f.marcas.length > 0 && <Dato k="Marcas" v={f.marcas.join(", ")} />}
            {f.ultimo_supervisor && <Dato k="Supervisor" v={f.ultimo_supervisor} />}
          </dl>
          {f.commits.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {f.commits.map((c, i) => (
                <li key={i} className="flex flex-col gap-0.5 text-[13px] leading-5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 tabular-nums text-[var(--fg-tertiary)] sm:w-24">
                    {hora(c.cuando)}
                  </span>
                  <span className="min-w-0 break-words text-[var(--fg-secondary)]">{c.msg}</span>
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

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 gap-2 py-0.5">
      <dt className="shrink-0 text-[var(--fg-tertiary)]">{k}:</dt>
      <dd className="min-w-0 break-words text-[var(--fg-secondary)]">{v}</dd>
    </div>
  );
}

function Consumo({ estado }: { estado: Estado }) {
  const dias = estado.consumo.por_dia;
  const max = Math.max(1, ...dias.map((d) => d.total));
  const lider = estado.consumo.ranking[0];

  return (
    <section className="rounded-2xl border border-[var(--border-1)] bg-white p-4 md:p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cn(ETIQUETA, "text-[var(--fg-secondary)]")}>La cuenta de Claude</h2>
        <span className="text-[12px] text-[var(--fg-tertiary)]">últimos 7 días</span>
      </div>
      {lider && lider.tokens_7d > 0 && (
        <p className="mb-4 text-[14px] leading-6 text-[var(--fg-secondary)]">
          <b className="font-semibold text-black">{lider.tag}</b> se está comiendo la semana:{" "}
          <b className="font-semibold text-black">{lider.pct_semana}%</b> de{" "}
          {tk(estado.consumo.total_7d)} tokens.
        </p>
      )}

      <div className="flex h-36 items-end gap-2 md:gap-4">
        {dias.map((d, i) => {
          const h = Math.round((d.total / max) * 100);
          const esHoy = i === dias.length - 1;
          return (
            <div
              key={d.dia}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="text-[12px] font-medium tabular-nums text-black">{tk(d.total)}</span>
              <div
                className={cn("w-full max-w-[44px] rounded-t-md", esHoy ? "bg-black" : "bg-neutral-300")}
                style={{ height: `${Math.max(h, d.total ? 3 : 1)}%` }}
                title={`${d.dia}: ${d.total.toLocaleString("es-MX")} tokens`}
              />
              <span className="w-full truncate text-center text-[12px] capitalize text-[var(--fg-tertiary)]">
                {diaCorto(d.dia)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sin separar la caché, "tokens" no quiere decir nada: leer caché es casi todo. */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border-1)] pt-4 sm:grid-cols-4">
        {(
          [
            ["Entrada", "entrada"],
            ["Salida", "salida"],
            ["Caché nuevo", "cache_nuevo"],
            ["Caché leído", "cache_leido"],
          ] as const
        ).map(([label, k]) => {
          const v = dias.reduce((a, d) => a + d[k], 0);
          return (
            <div key={k}>
              <p className="text-[12px] text-[var(--fg-tertiary)]">{label}</p>
              <p className="text-[16px] font-semibold tabular-nums text-black">{tk(v)}</p>
            </div>
          );
        })}
      </div>

      {estado.consumo.ranking.length > 0 && (
        <div className="mt-4 border-t border-[var(--border-1)] pt-4">
          <p className="mb-2 text-[12px] text-[var(--fg-tertiary)]">Quién gasta</p>
          <div className="flex flex-col gap-1.5">
            {estado.consumo.ranking
              .filter((r) => r.tokens_7d > 0)
              .slice(0, 6)
              .map((r) => (
                <div key={r.tag} className="flex items-center gap-3 text-[13px]">
                  <span className="w-28 shrink-0 truncate text-[var(--fg-secondary)] sm:w-40">
                    {r.tag}
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-black"
                      style={{ width: `${Math.max(r.pct_semana, 1)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right tabular-nums text-[var(--fg-tertiary)]">
                    {tk(r.tokens_7d)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {estado.consumo.fuera_de_frentes.length > 0 && (
        <div className="mt-4 border-t border-[var(--border-1)] pt-4">
          <p className="mb-2 text-[12px] text-[var(--fg-tertiary)]">
            Gasto fuera de los frentes vivos (worktrees ya borrados, repos sueltos, chats)
          </p>
          <div className="flex flex-wrap gap-2">
            {estado.consumo.fuera_de_frentes.map((x) => (
              <span
                key={x.donde}
                className="max-w-full truncate rounded-full border border-[var(--border-1)] bg-white px-3 py-1 font-mono text-[12px] text-[var(--fg-secondary)]"
              >
                {x.donde} · {tk(x.tokens_7d.total)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Salud({ salud }: { salud: Estado["salud"] }) {
  const barras = [
    salud.disco && {
      k: "Disco",
      pct: salud.disco.pct,
      nota: `${salud.disco.libre_gb} GB libres`,
      mal: salud.disco.alerta,
    },
    salud.memoria?.ram && {
      k: "RAM",
      pct: salud.memoria.ram.pct,
      nota: `${Math.round(salud.memoria.ram.total / 1e9)} GB en total`,
      mal: salud.memoria.ram.pct > 90,
    },
    salud.memoria?.swap && {
      k: "Swap",
      pct: salud.memoria.swap.pct,
      nota: `${Math.round(salud.memoria.swap.total / 1e9)} GB en total`,
      mal: salud.memoria.swap.pct > 80,
    },
  ].filter(Boolean) as { k: string; pct: number; nota: string; mal: boolean }[];

  return (
    <section className="rounded-2xl border border-[var(--border-1)] bg-white p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cn(ETIQUETA, "text-[var(--fg-secondary)]")}>El Hetzner</h2>
        <span className="text-[12px] text-[var(--fg-tertiary)]">
          {salud.claude_vivos} {salud.claude_vivos === 1 ? "sesión viva" : "sesiones vivas"}
          {salud.carga ? ` · carga ${salud.carga[0].toFixed(1)}` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {barras.map((b) => (
          <div key={b.k} className="flex items-center gap-3 text-[13px]">
            <span className="w-14 shrink-0 text-[var(--fg-secondary)]">{b.k}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${b.pct}%`, backgroundColor: b.mal ? C.rojo : "#000" }}
              />
            </div>
            <span className="w-11 shrink-0 text-right tabular-nums text-black">{b.pct}%</span>
            <span className="hidden w-28 shrink-0 text-right text-[12px] text-[var(--fg-tertiary)] sm:block">
              {b.nota}
            </span>
          </div>
        ))}
      </div>

      {salud.servicios_caidos.length > 0 && (
        <div className="mt-4 border-t border-[var(--border-1)] pt-4">
          <p className="mb-2 text-[12px] text-[var(--fg-tertiary)]">Servicios caídos</p>
          <div className="flex flex-wrap gap-2">
            {salud.servicios_caidos.map((s) => (
              <span
                key={s.unidad}
                className="rounded-full border border-red-600/30 bg-red-50 px-3 py-1 font-mono text-[12px] text-red-900"
              >
                {s.unidad}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--border-1)] pt-4">
        <p className="mb-2 text-[12px] text-[var(--fg-tertiary)]">Lo que relanza agentes</p>
        <div className="flex flex-col gap-1.5">
          {salud.crons_supervisor.map((c) => (
            <div
              key={`${c.ref}-${c.tag}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]"
            >
              <span className="min-w-0 break-all font-mono text-[12px] text-black">{c.ref}</span>
              <span className="text-[12px] text-[var(--fg-tertiary)]">{c.cada}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[12px]",
                  c.supervisado
                    ? "border-emerald-600/30 bg-emerald-50 text-emerald-800"
                    : "border-red-600/30 bg-red-50 text-red-900",
                )}
              >
                {c.supervisado ? "con freno" : "sin freno"}
              </span>
            </div>
          ))}
          {salud.crons_supervisor.length === 0 && (
            <p className="text-[13px] text-[var(--fg-tertiary)]">Nada relanza agentes.</p>
          )}
        </div>
      </div>

      {salud.barrido && (
        <div className="mt-4 border-t border-[var(--border-1)] pt-4">
          <p className="mb-2 text-[12px] text-[var(--fg-tertiary)]">Último barrido</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-1)] p-3 font-mono text-[12px] leading-5 text-[var(--fg-secondary)]">
            {salud.barrido}
          </pre>
        </div>
      )}
    </section>
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
