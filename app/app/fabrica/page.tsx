"use client";

/**
 * /app/fabrica — La fábrica en vivo (Unicorn 1.0). Maqueta C aprobada por Luis (30-sep-2026).
 *
 * Arriba lo que está pasando AHORA (qué trabajo, de qué proyecto, cuánto lleva, con
 * barra de avance real cuando hay medidor), luego métricas que sirven (trabajando, en
 * cola, tokens de hoy, límite de Codex), la alianza diciendo qué hace cada quien, el
 * consumo de tokens por motor, el feed, V-Trading y servicios.
 *
 * Todas las horas son las del reloj de TU computadora y corren en vivo. Todo dato es
 * real (colector del Hetzner vía /api/fabrica/estado); lo que no tiene medidor se dice.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconBrain, IconCode, IconCpu } from "@/components/brand/VFIcons";
import { GrupoFiltros, type OpcionFiltro } from "@/components/ui/BarraFiltros";
import { CONCEPTOS, METRICAS, SECCIONES, VTRADING, paraQue, queEsAgente, queEsEvento, queEsServicio } from "@/lib/fabrica/glosario";

const REFRESH_TODO_MS = 30_000;
const REFRESH_AHORA_MS = 5_000;

type Json = Record<string, unknown>;
type Evento = { t: string; tipo: string; titulo: string; detalle: string };
type Trabajo = {
  id: number;
  agente: string;
  proyecto: string | null;
  titulo: string;
  estado: "trabajando" | "en cola";
  avance: number | null;
  rastro: string | null;
  desde: number | null;
  encerrado?: boolean | null;
  fueraDeCola?: boolean;
};
type Terminado = {
  id: number;
  agente: string;
  proyecto: string | null;
  titulo: string;
  estado: string;
  fin: number | null;
  duracion: number | null;
  error: string | null;
};
type Proceso = { motor: string; proyecto: string; job: number | null; encerrado: boolean | null; titulo?: string | null; desde: number | null };
type Motor = { entrada: number; cache: number; salida: number; horas: number[] };
type Tokens = { dia: string; claude: Motor | null; codex: Motor | null; cerebras: Motor | null; cerebras_llamadas: number };
type Ahora = {
  generado: number;
  trabajos: Trabajo[] | null;
  terminados: Terminado[] | null;
  procesos: Proceso[] | null;
  vivo: { slot: string; proyecto: string; listo: boolean; ocioso_seg: number | null }[] | null;
  tokens: Tokens | null;
  codex_limite: { usado_pct: number; ventana_min: number; reinicia: number } | null;
};

const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const fmtN = (v: number | null, dec = 0) =>
  v === null ? "—" : v.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUsd = (v: number | null) =>
  v === null ? "—" : `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtTok(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("es-MX", { maximumFractionDigits: 2 })} B`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("es-MX", { maximumFractionDigits: n >= 1e8 ? 0 : 1 })} M`;
  if (n >= 1e3) return `${(n / 1e3).toLocaleString("es-MX", { maximumFractionDigits: 1 })} k`;
  return String(n);
}
const totalMotor = (m: Motor | null | undefined) => (m ? m.entrada + m.cache + m.salida : 0);

/** Fecha de cualquier formato que mande el colector (ISO, "Tue ... UTC" o epoch en segundos). */
function aMs(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const norm = v.includes(" UTC") ? v.replace(/^\w{3} /, "").replace(" UTC", "Z").replace(" ", "T") : v;
  const d = new Date(norm).getTime();
  return Number.isNaN(d) ? null : d;
}
/** Hora con el reloj de la computadora de quien mira (sin zona fija). */
function hora(v: string | number | null | undefined, seg = false): string {
  const ms = aMs(v);
  return ms === null
    ? "—"
    : new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", ...(seg ? { second: "2-digit" } : {}), hour12: false });
}
function duracion(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, "0")} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")} min`;
}
function hace(v: string | number | null | undefined, ahoraMs: number): string {
  const ms = aMs(v);
  if (ms === null) return "—";
  const s = Math.max(0, (ahoraMs - ms) / 1000);
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${Math.floor(s)} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  return `hace ${Math.floor(s / 86400)} d`;
}

/** Hora (0-23) en Cancún: las cubetas de tokens las arma el colector con ese día. */
function horaCancun(ms: number): number {
  return Number(new Date(ms).toLocaleString("en-US", { timeZone: "America/Cancun", hour: "2-digit", hour12: false })) % 24;
}

/** El reloj de la computadora, cada segundo. */
function useReloj(): number {
  // Arranca en 0 y se pone en el navegador: así el HTML del servidor no choca con la hora local.
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const NOMBRE_AGENTE: Record<string, string> = { claude: "Claude", codex: "Codex", mesh: "Cerebras", cerebras: "Cerebras", v: "V", shell: "Shell", browser: "Navegador", grok: "Grok" };
const nombreAgente = (a: string) => NOMBRE_AGENTE[a] ?? a;

/**
 * Ícono "i" con la explicación de algo. En escritorio basta pasar el mouse (title);
 * tocándolo (celular o clic) se despliega una nota fija que nunca se sale de la
 * pantalla. Los lectores de pantalla la leen siempre por aria-describedby.
 */
function Info({ texto, etiqueta }: { texto: string | null | undefined; etiqueta?: string }) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const medir = useCallback(() => {
    const r = boton.current?.getBoundingClientRect();
    if (!r) return null;
    const width = Math.min(272, window.innerWidth - 32);
    const left = Math.min(Math.max(16, r.left + r.width / 2 - width / 2), window.innerWidth - 16 - width);
    return { left, top: r.bottom + 6, width };
  }, []);

  const abierto = pos !== null;
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (ev: Event) => {
      if (ev.type === "keydown" && (ev as KeyboardEvent).key !== "Escape") return;
      if (ev.type === "pointerdown" && boton.current?.contains(ev.target as Node)) return;
      setPos(null);
    };
    // Al hacer scroll la nota sigue al ícono en vez de cerrarse (en celular el toque mueve la página).
    const seguir = () => setPos(medir());
    document.addEventListener("pointerdown", cerrar);
    document.addEventListener("keydown", cerrar);
    window.addEventListener("scroll", seguir, true);
    window.addEventListener("resize", seguir);
    return () => {
      document.removeEventListener("pointerdown", cerrar);
      document.removeEventListener("keydown", cerrar);
      window.removeEventListener("scroll", seguir, true);
      window.removeEventListener("resize", seguir);
    };
  }, [abierto, medir]);

  if (!texto) return null;
  const alternar = () => setPos(pos ? null : medir());
  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={alternar}
        title={texto}
        aria-label={`Qué es${etiqueta ? ` ${etiqueta}` : ""}`}
        aria-describedby={id}
        aria-expanded={pos !== null}
        className="inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-[var(--border-1)] align-middle font-serif text-[11px] italic leading-none text-[var(--fg-muted)] transition hover:border-black hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black"
      >
        i
      </button>
      <span id={id} className="sr-only">
        {texto}
      </span>
      {pos && (
        <span
          aria-hidden
          className="fixed z-50 rounded-xl border border-[var(--border-1)] bg-white px-3.5 py-2.5 text-left text-[13px] font-normal normal-case leading-5 tracking-normal text-[var(--fg-secondary)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
        >
          {texto}
        </span>
      )}
    </>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-[var(--border-1)] bg-white", className)}>{children}</section>;
}
function CardHead({ title, right, info }: { title: string; right?: React.ReactNode; info?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-1)] px-5 py-4">
      <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] text-black">
        {title}
        <Info texto={info} etiqueta={title} />
      </h2>
      {right}
    </div>
  );
}
function Dot({ ok, pulso }: { ok: boolean | null; pulso?: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex h-2 w-2 shrink-0">
      {pulso && <span className="absolute inset-0 animate-ping rounded-full bg-[#1fb95a] opacity-60" />}
      <span className={cn("relative inline-block h-2 w-2 rounded-full", ok === null ? "bg-[#c4c4c0]" : ok ? "bg-[#1fb95a]" : "bg-[#e5484d]")} />
    </span>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-[var(--border-1)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
      {children}
    </span>
  );
}

/** Barra de avance: real si hay medidor; si no, en movimiento y dicho en texto. */
function Barra({ avance, activo }: { avance: number | null; activo: boolean }) {
  if (avance !== null) {
    return (
      <div className="h-1.5 overflow-hidden rounded-full bg-[#ecece8]" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-black transition-[width] duration-700" style={{ width: `${Math.max(3, Math.min(100, avance))}%` }} />
      </div>
    );
  }
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#ecece8]" aria-hidden>
      {activo && <div className="vf-indet h-full w-1/4 rounded-full bg-black/70" />}
    </div>
  );
}

function BarrasHora({ tokens, horaActual }: { tokens: Tokens | null; horaActual: number }) {
  const filas = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => ({
        h,
        claude: tokens?.claude?.horas?.[h] ?? 0,
        codex: tokens?.codex?.horas?.[h] ?? 0,
        cerebras: tokens?.cerebras?.horas?.[h] ?? 0,
      })),
    [tokens],
  );
  const max = Math.max(1, ...filas.map((f) => f.claude + f.codex + f.cerebras));
  if (!tokens) return <p className="font-mono text-[11px] text-[var(--fg-muted)]">sin lectura de tokens todavía</p>;
  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]" role="img" aria-label="Tokens por hora, hoy">
        {filas.map((f) => {
          const t = f.claude + f.codex + f.cerebras;
          return (
            <div key={f.h} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${String(f.h).padStart(2, "0")}:00 · ${fmtTok(t)} tokens`}>
              <div className={cn("flex w-full flex-col-reverse overflow-hidden rounded-[2px]", f.h === horaActual && "outline outline-1 outline-offset-1 outline-black")} style={{ height: `${(t / max) * 100}%`, minHeight: t ? 2 : 0 }}>
                <div className="bg-black" style={{ height: `${t ? (f.claude / t) * 100 : 0}%` }} />
                <div className="bg-[#8a8c90]" style={{ height: `${t ? (f.codex / t) * 100 : 0}%` }} />
                <div className="bg-[#cfd0cc]" style={{ height: `${t ? (f.cerebras / t) * 100 : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--fg-muted)]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--fg-secondary)]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-black" />Claude</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#8a8c90]" />Codex</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#cfd0cc]" />Cerebras</span>
      </div>
    </div>
  );
}

const ETIQUETA_TIPO: Record<string, string> = { brain: "BRAIN", "v-trading": "V-TRADING", codex: "CODEX", claude: "CLAUDE", cerebras: "CEREBRAS", v: "V", cola: "COLA" };

export default function FabricaPage() {
  const reloj = useReloj();
  const [estado, setEstado] = useState<Json | null>(null);
  const [ahora, setAhora] = useState<Ahora | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [todos, setTodos] = useState(false);
  const vivo = useRef(true);

  const cargar = useCallback(async (soloAhora: boolean) => {
    try {
      const r = await fetch(`/api/fabrica/estado${soloAhora ? "?solo=ahora" : ""}`, { cache: "no-store" });
      const j = obj(await r.json());
      if (!r.ok) throw new Error(str(j.error) ?? `HTTP ${r.status}`);
      if (!vivo.current) return;
      if (!soloAhora) setEstado(j);
      if (j.ahora) setAhora(j.ahora as Ahora);
      setError(null);
    } catch (e) {
      if (vivo.current) setError(e instanceof Error ? e.message : "sin señal");
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    void cargar(false);
    const lento = setInterval(() => void cargar(false), REFRESH_TODO_MS);
    const rapido = setInterval(() => {
      if (document.visibilityState === "visible") void cargar(true);
    }, REFRESH_AHORA_MS);
    return () => {
      vivo.current = false;
      clearInterval(lento);
      clearInterval(rapido);
    };
  }, [cargar]);

  const e = estado ?? {};
  const mesh = obj(e.mesh);
  const codex = obj(e.codex);
  const vt = obj(e.vtrading);
  const v60 = obj(vt["v6.0"]);
  const v59 = obj(vt["v5.9"]);
  const servicios = Object.entries(obj(e.servicios)).map(([k, v]) => [k, String(v)] as const);
  const sanos = servicios.filter(([, v]) => v === "active").length;

  const eventos = useMemo<Evento[]>(
    () =>
      (Array.isArray(e.eventos) ? e.eventos : []).map((x) => {
        const o = obj(x);
        return { t: str(o.t) ?? "", tipo: str(o.tipo) ?? "", titulo: str(o.titulo) ?? "—", detalle: str(o.detalle) ?? "" };
      }),
    [e.eventos],
  );
  // Conteo por tipo sobre lo que ya llegó del colector: es lo que se ve en las pastillas.
  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of eventos) if (x.tipo) m.set(x.tipo, (m.get(x.tipo) ?? 0) + 1);
    return m;
  }, [eventos]);
  // Si el tipo elegido deja de venir en el feed (se refresca cada tanto), se vuelve a "Todos"
  // en vez de dejar la lista vacía sin explicación.
  const filtroVigente = filtro !== "todos" && porTipo.has(filtro) ? filtro : "todos";
  const filtrados = filtroVigente === "todos" ? eventos : eventos.filter((x) => x.tipo === filtroVigente);
  const opcionesTipo = useMemo<OpcionFiltro[]>(
    () => [
      { id: "todos", label: "Todos", n: eventos.length },
      ...Array.from(porTipo.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => ({ id: t, label: ETIQUETA_TIPO[t] ?? t, n })),
    ],
    [eventos.length, porTipo],
  );
  const visibles = todos ? filtrados : filtrados.slice(0, 7);

  // Lo que está pasando ahora: jobs de la cola + agentes corriendo fuera de ella.
  const enCurso = useMemo<Trabajo[]>(() => {
    const lista: Trabajo[] = (ahora?.trabajos ?? []).map((t) => ({ ...t }));
    for (const p of ahora?.procesos ?? []) {
      const suyo = lista.find(
        (t) => t.id === p.job || (t.estado === "trabajando" && t.agente === p.motor && t.proyecto === p.proyecto),
      );
      if (suyo) {
        suyo.encerrado = p.encerrado;
        continue;
      }
      lista.push({
        id: -(p.desde ?? Math.random()),
        agente: p.motor,
        proyecto: p.proyecto,
        titulo: p.titulo ?? `Sesión de ${nombreAgente(p.motor)} lanzada fuera de la cola`,
        estado: "trabajando",
        avance: null,
        rastro: null,
        desde: p.desde,
        encerrado: p.encerrado,
        fueraDeCola: true,
      });
    }
    return lista.sort((a, b) => (a.estado === b.estado ? (a.desde ?? 0) - (b.desde ?? 0) : a.estado === "trabajando" ? -1 : 1));
  }, [ahora]);
  const trabajando = enCurso.filter((t) => t.estado === "trabajando");
  const enCola = enCurso.filter((t) => t.estado === "en cola");

  const tk = ahora?.tokens ?? null;
  const tokensHoy = tk ? totalMotor(tk.claude) + totalMotor(tk.codex) + totalMotor(tk.cerebras) : null;
  const codexLim = ahora?.codex_limite ?? null;
  const cerebrasOk = str(mesh.cerebras) === "up";
  const codexOk = str(codex.sesion) === "ChatGPT Pro";
  const v60Abiertas = num(v60.abiertas) ?? 0;
  const v59Net = num(v59.net_total);
  const winRate = num(v59.win_rate);
  const edadDatos = reloj && ahora?.generado ? Math.max(0, Math.round(reloj / 1000 - ahora.generado)) : null;
  const sinSenal = Boolean(error) || (edadDatos !== null && edadDatos > 90);

  const quehace = (motor: string) => {
    const mios = trabajando.filter((t) => t.agente === motor);
    if (!mios.length) return null;
    const proys = Array.from(new Set(mios.map((t) => t.proyecto ?? "sin proyecto")));
    return `trabajando en ${proys.slice(0, 3).join(", ")}${proys.length > 3 ? ` y ${proys.length - 3} más` : ""}`;
  };
  const alianza = [
    {
      n: "Claude",
      clave: "claude",
      Icono: IconBrain,
      rol: "director: arquitectura y criterio",
      activo: quehace("claude"),
      reposo: `en reposo · ${fmtTok(totalMotor(tk?.claude))} tokens hoy`,
      ok: true as boolean | null,
    },
    {
      n: "Codex",
      clave: "codex",
      Icono: IconCode,
      rol: `manos · ${str(codex.sesion) ?? "sesión desconocida"}`,
      activo: quehace("codex"),
      reposo: `en reposo · ${codexLim ? `${fmtN(codexLim.usado_pct)}% de la semana usado` : "sin lectura del límite"}`,
      ok: estado ? codexOk : null,
    },
    {
      n: "Cerebras",
      clave: "mesh",
      Icono: IconCpu,
      rol: "obrero: gpt-oss-120b · qwen-3.8-27b",
      activo: null,
      reposo: `${fmtN(tk?.cerebras_llamadas ?? null)} llamadas hoy · ${fmtN(num(mesh.texto_ms))} ms`,
      ok: estado ? cerebrasOk : null,
    },
  ];

  return (
    <div className="min-h-full bg-[#f7f7f5]">
      <style>{`@keyframes vf-indet{0%{transform:translateX(-110%)}100%{transform:translateX(420%)}}.vf-indet{animation:vf-indet 1.6s cubic-bezier(.4,0,.2,1) infinite}@media (prefers-reduced-motion:reduce){.vf-indet{animation:none;width:100%;opacity:.25}}`}</style>
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-8 md:px-8 md:pt-12">
        {/* Encabezado */}
        <header className="mb-8 md:mb-10">
          <span className="inline-flex rounded-full border border-[var(--border-1)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Unicorn 1.0 · Fábrica
          </span>
          <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.6rem)] font-light leading-[0.95] tracking-[-0.045em] text-black">
            La fábrica, <span className="font-semibold">en vivo</span>
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-1)] bg-white px-3.5 py-1.5 text-[13px]">
              <Dot ok={!sinSenal} pulso={!sinSenal} />
              <span className={sinSenal ? "text-[#e5484d]" : "text-[#138a43]"}>{sinSenal ? "Sin señal" : "En vivo"}</span>
              <span className="text-[var(--fg-muted)]">·</span>
              <span className="font-mono tabular-nums text-black">{reloj ? hora(reloj, true) : "--:--:--"}</span>
            </span>
            <span className="font-mono text-[12px] text-[var(--fg-muted)]">
              {edadDatos === null ? "esperando datos…" : `datos de hace ${edadDatos} s`}
            </span>
          </div>
        </header>

        {error && !estado && (
          <Card className="mb-6 px-5 py-4">
            <p className="text-[14px] text-[var(--fg-secondary)]">No llegó el estado de la fábrica ({error}). Se reintenta solo.</p>
          </Card>
        )}

        {/* Trabajando ahora */}
        <Card className="mb-5">
          <CardHead
            title="Trabajando ahora"
            info={SECCIONES.trabajando}
            right={
              <span className="text-[13px] tabular-nums text-[var(--fg-muted)]">
                {trabajando.length} en curso · {enCola.length} en cola
              </span>
            }
          />
          <ul className="px-5">
            {ahora && enCurso.length === 0 && (
              <li className="py-6 text-[14px] text-[var(--fg-muted)]">Nadie está trabajando en este momento.</li>
            )}
            {!ahora && <li className="py-6 text-[14px] text-[var(--fg-muted)]">Leyendo la fábrica…</li>}
            {enCurso.map((t) => {
              const activo = t.estado === "trabajando";
              const lleva = t.desde ? duracion(reloj / 1000 - t.desde) : null;
              return (
                <li key={t.id} className="border-b border-[var(--border-1)] py-4 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium leading-6 text-black">{t.titulo}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--fg-secondary)]">
                        <span className="inline-flex items-center gap-1.5">
                          {nombreAgente(t.agente)}
                          <Info texto={queEsAgente(t.agente)} etiqueta={nombreAgente(t.agente)} />
                        </span>
                        <span className="text-[var(--fg-muted)]">·</span>
                        <span className="font-medium text-black">{t.proyecto ?? "sin proyecto"}</span>
                        {t.id > 0 && <span className="font-mono text-[11px] text-[var(--fg-muted)]">#{t.id}</span>}
                        {t.encerrado && (
                          <span className="inline-flex items-center gap-1.5">
                            <Chip>en jaula</Chip>
                            <Info texto={CONCEPTOS.enJaula} etiqueta="en jaula" />
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-[var(--fg-muted)]">
                        <span className="text-[var(--fg-secondary)]">Para qué:</span> {paraQue(t, nombreAgente(t.agente))}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
                      {activo ? (t.avance !== null ? `${t.avance}%` : "trabajando") : "en cola"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Barra avance={activo ? t.avance : null} activo={activo} />
                  </div>
                  <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-mono text-[11px] text-[var(--fg-muted)]">
                    {t.rastro ? (
                      <span className="min-w-0 truncate">{t.rastro}</span>
                    ) : activo && t.avance === null ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span className="truncate">sin medidor de avance</span>
                        <Info texto={CONCEPTOS.sinMedidor} etiqueta="sin medidor de avance" />
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="shrink-0 tabular-nums">{activo ? (lleva ? `lleva ${lleva}` : "") : t.desde ? `esperando ${duracion(reloj / 1000 - t.desde)}` : ""}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          {(ahora?.vivo?.length || ahora?.terminados?.length) ? (
            <div className="border-t border-[var(--border-1)] px-5 py-3 text-[13px] text-[var(--fg-secondary)]">
              {ahora?.vivo?.length ? (
                <p>
                  <span className="inline-flex items-center gap-1.5 text-black">
                    Motor vivo:
                    <Info texto={CONCEPTOS.motorVivo} etiqueta="motor vivo" />
                  </span>{" "}
                  {ahora.vivo.map((v) => `${v.proyecto}${v.listo ? "" : " (arrancando)"}`).join(" · ")}
                </p>
              ) : null}
              {ahora?.terminados?.length ? (
                <p className="mt-1">
                  <span className="inline-flex items-center gap-1.5 text-black">
                    Terminó en los últimos 30 min:
                    <Info texto={CONCEPTOS.terminados} etiqueta="terminados" />
                  </span>{" "}
                  {ahora.terminados.slice(0, 4).map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && " · "}
                      {t.proyecto ?? "—"} {t.estado === "falló" ? "falló" : "listo"} {hace(t.fin, reloj)}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Actividad en vivo */}
          <Card className="order-2 self-start lg:order-1">
            <CardHead
              title="Actividad"
              info={SECCIONES.actividad}
              right={
                <span className="text-[13px] tabular-nums text-[var(--fg-muted)]">
                  {filtroVigente === "todos" ? `${eventos.length} eventos` : `${filtrados.length} de ${eventos.length}`}
                </span>
              }
            />
            {porTipo.size > 1 && (
              <div className="border-b border-[var(--border-1)] px-5 py-3">
                <GrupoFiltros
                  etiqueta="Filtrar eventos por tipo"
                  ocultarEtiqueta
                  opciones={opcionesTipo}
                  valor={filtroVigente}
                  onCambio={(v) => {
                    setFiltro(v);
                    setTodos(false);
                  }}
                />
              </div>
            )}
            {filtroVigente !== "todos" && queEsEvento(filtroVigente) && (
              <p className="border-b border-[var(--border-1)] px-5 py-3 text-[12px] leading-5 text-[var(--fg-muted)]">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-secondary)]">{ETIQUETA_TIPO[filtroVigente] ?? filtroVigente}</span> · {queEsEvento(filtroVigente)}
              </p>
            )}
            <ol className="relative px-5 py-2">
              {visibles.length === 0 && (
                <li className="py-6 text-[14px] text-[var(--fg-muted)]">
                  {eventos.length === 0 ? "Todavía no hay eventos." : "No hay eventos de este tipo."}
                </li>
              )}
              {visibles.map((ev, i) => (
                <li key={`${ev.t}-${i}`} className="grid grid-cols-[64px_16px_minmax(0,1fr)] gap-3 border-b border-[var(--border-1)] py-5 last:border-b-0 md:grid-cols-[72px_16px_minmax(0,1fr)_auto]">
                  <span className="pt-0.5">
                    <time className="block font-mono text-[12px] tabular-nums text-black">{hora(ev.t)}</time>
                    <span className="block font-mono text-[10px] text-[var(--fg-muted)]">{hace(ev.t, reloj)}</span>
                  </span>
                  <span className="relative flex justify-center pt-1.5">
                    {i < visibles.length - 1 && <span aria-hidden className="absolute left-1/2 top-4 h-[calc(100%+2.5rem)] w-px -translate-x-1/2 bg-[var(--border-1)]" />}
                    <span className={cn("relative h-2 w-2 rounded-full", i === 0 ? "bg-[#1fb95a] ring-4 ring-[#1fb95a]/15" : "bg-[#c4c4c0]")} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium leading-6 text-black">{ev.titulo}</p>
                    {ev.detalle && <p className="mt-0.5 break-words text-[13px] leading-5 text-[var(--fg-secondary)]">{ev.detalle}</p>}
                  </div>
                  <span className="col-start-3 inline-flex items-center gap-1.5 md:col-start-auto md:self-start">
                    <Chip>{ETIQUETA_TIPO[ev.tipo] ?? ev.tipo}</Chip>
                    <Info texto={queEsEvento(ev.tipo)} etiqueta={`un evento ${ETIQUETA_TIPO[ev.tipo] ?? ev.tipo}`} />
                  </span>
                </li>
              ))}
            </ol>
            {filtrados.length > 7 && (
              <div className="border-t border-[var(--border-1)] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setTodos((v) => !v)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-[14px] font-medium text-white transition hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  {todos ? "Ver menos" : `Ver toda la actividad (${filtrados.length})`}
                </button>
              </div>
            )}
          </Card>

          <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
            {/* Métricas */}
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] text-black">
                Hoy en la fábrica
                <Info texto={SECCIONES.hoy} etiqueta="Hoy en la fábrica" />
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-[var(--border-1)]">
                {[
                  ["Trabajando", ahora ? fmtN(trabajando.length) : "—", METRICAS.trabajando],
                  ["En cola", ahora ? fmtN(enCola.length) : "—", METRICAS.enCola],
                  ["Tokens hoy", fmtTok(tokensHoy), METRICAS.tokensHoy],
                  ["Codex semana", codexLim ? `${fmtN(codexLim.usado_pct)}%` : "—", METRICAS.codexSemana],
                ].map(([k, v, q], i) => (
                  <div key={k} className={cn("min-w-0", i > 0 && "sm:pl-4")}>
                    <dt className="flex items-center gap-1.5 text-[12px] text-[var(--fg-secondary)]">
                      {k}
                      <Info texto={q} etiqueta={k} />
                    </dt>
                    <dd className="mt-1 text-[26px] font-medium tabular-nums tracking-[-0.03em] text-black">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] text-[var(--fg-secondary)]">
                  Tokens por hora, hoy (hora de Cancún)
                  <Info texto={METRICAS.tokensHora} etiqueta="tokens por hora" />
                </p>
                <BarrasHora tokens={tk} horaActual={horaCancun(reloj)} />
              </div>
            </Card>

            {/* Alianza */}
            <Card>
              <CardHead title="La alianza" info={SECCIONES.alianza} />
              <ul className="px-5">
                {alianza.map((a) => (
                  <li key={a.n} className="flex items-center gap-3 border-b border-[var(--border-1)] py-3.5 last:border-b-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border-1)] bg-[#f7f7f5] text-black">
                      <a.Icono size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[15px] font-medium text-black">
                        {a.n}
                        <Info texto={queEsAgente(a.clave)} etiqueta={a.n} />
                      </span>
                      <span className="block text-[13px] leading-5 text-[var(--fg-secondary)]">{a.activo ?? a.reposo}</span>
                      <span className="block truncate text-[11px] text-[var(--fg-muted)]">{a.rol}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--fg-secondary)]">
                      <Dot ok={a.ok === false ? false : a.activo ? true : null} pulso={Boolean(a.activo)} />
                      {a.ok === false ? "Caído" : a.activo ? "Trabajando" : "En reposo"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Consumo de tokens */}
            <Card>
              <CardHead title="Consumo de tokens" info={SECCIONES.tokens} right={<span className="text-[13px] text-[var(--fg-muted)]">hoy</span>} />
              <ul className="px-5 py-1">
                {(
                  [
                    ["Claude", "claude", tk?.claude, "servidor: daemon, agentes y jaula"],
                    ["Codex", "codex", tk?.codex, "ChatGPT Pro"],
                    ["Cerebras", "mesh", tk?.cerebras, "el router sólo anota los de salida"],
                  ] as const
                ).map(([n, clave, m, nota]) => (
                  <li key={n} className="border-b border-[var(--border-1)] py-3 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-black">
                        {n}
                        <Info texto={queEsAgente(clave)} etiqueta={n} />
                      </span>
                      <span className="text-[18px] font-medium tabular-nums tracking-[-0.02em] text-black">{fmtTok(m ? totalMotor(m) : null)}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--fg-muted)]">
                      {m && (
                        <>
                          <Info texto={`${METRICAS.entrada} ${METRICAS.cache} ${METRICAS.salida}`} etiqueta="entrada, caché y salida" />{" "}
                        </>
                      )}
                      {m ? `entrada ${fmtTok(m.entrada)} · caché ${fmtTok(m.cache)} · salida ${fmtTok(m.salida)}` : "sin consumo hoy"} · {nota}
                    </p>
                    {n === "Codex" && codexLim && (
                      <div className="mt-2">
                        <Barra avance={codexLim.usado_pct} activo={false} />
                        <p className="mt-1 font-mono text-[11px] text-[var(--fg-muted)]">
                          {fmtN(codexLim.usado_pct)}% del límite semanal · se renueva {new Date(codexLim.reinicia * 1000).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {/* V-Trading */}
            <Card>
              <CardHead
                title="V-Trading"
                info={SECCIONES.vtrading}
                right={
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-muted)]">
                    modo papel
                    <Info texto={VTRADING.modoPapel} etiqueta="modo papel" />
                  </span>
                }
              />
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] text-[var(--fg-secondary)]">
                    v6.0
                    <Info texto={VTRADING.v60} etiqueta="v6.0" />
                  </p>
                  <p className="mt-1 text-[30px] font-medium tabular-nums tracking-[-0.03em] text-black">{fmtN(v60Abiertas)}</p>
                  <p className="text-[13px] text-[var(--fg-secondary)]">abiertas</p>
                  {v60Abiertas > 0 && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e9f8ef] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#138a43]">
                      <Dot ok /> En mercado
                    </span>
                  )}
                </div>
                <span className="h-full w-px bg-[var(--border-1)]" aria-hidden />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] text-[var(--fg-secondary)]">
                    v5.9
                    <Info texto={VTRADING.v59} etiqueta="v5.9" />
                  </p>
                  <p className="mt-1 text-[30px] font-medium tabular-nums tracking-[-0.03em] text-black">{fmtN(num(v59.cerradas))}</p>
                  <p className="text-[13px] text-[var(--fg-secondary)]">cerradas</p>
                  <p className={cn("mt-2 text-[15px] tabular-nums", v59Net !== null && v59Net < 0 ? "text-[#e5484d]" : "text-[#138a43]")}>{fmtUsd(v59Net)}</p>
                  <p className="text-[13px] text-[var(--fg-secondary)]">{winRate === null ? "—" : `${fmtN(winRate * 100, 1)}% ganadoras`}</p>
                </div>
              </div>
            </Card>

            {/* Servicios */}
            <Card>
              <CardHead title="Servicios" info={SECCIONES.servicios} right={<span className="text-[13px] tabular-nums text-[var(--fg-muted)]">{sanos}/{servicios.length}</span>} />
              <ul className="grid grid-cols-1 gap-x-6 px-5 py-2 sm:grid-cols-2">
                {servicios.length === 0 && <li className="py-3 text-[13px] text-[var(--fg-muted)]">—</li>}
                {servicios.map(([n, v]) => (
                  <li key={n} className="flex items-start justify-between gap-3 border-b border-[var(--border-1)] py-2.5 text-[14px]">
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span className="pt-[7px]">
                        <Dot ok={v === "active"} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-black">{n}</span>
                        {queEsServicio(n) && <span className="mt-0.5 block text-[12px] leading-[18px] text-[var(--fg-muted)]">{queEsServicio(n)}</span>}
                      </span>
                    </span>
                    <span className={cn("shrink-0 pt-0.5 text-[12px]", v === "active" ? "text-[var(--fg-secondary)]" : "text-[#e5484d]")}>
                      {v === "active" ? "En vivo" : "Caído"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <p className="mt-8 font-mono text-[11px] text-[var(--fg-muted)]">
          Lo de ahora se actualiza cada 5 s · el resto cada 30 s · horas con el reloj de tu computadora · Claude dirige · Codex construye · Cerebras carga
        </p>
      </div>
    </div>
  );
}
