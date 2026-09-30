"use client";

/**
 * /app/fabrica — La fábrica en vivo (Unicorn 1.0). Maqueta C aprobada por Luis (30-sep-2026):
 * feed de actividad al centro + panel derecho (métricas, alianza, V-Trading, servicios).
 * Fuente: /api/fabrica/estado (owner-only) → colector del Hetzner. Todo dato es real; lo que falta se muestra "—".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const REFRESH_MS = 20_000;
const TZ = "America/Cancun";

type Json = Record<string, unknown>;
type Evento = { t: string; tipo: string; titulo: string; detalle: string };

const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const fmtN = (v: number | null, dec = 0) =>
  v === null ? "—" : v.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUsd = (v: number | null) =>
  v === null ? "—" : `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fecha(s: string | null): Date | null {
  if (!s) return null;
  const norm = s.includes(" UTC") ? s.replace(/^\w{3} /, "").replace(" UTC", "Z").replace(" ", "T") : s;
  const d = new Date(norm);
  return Number.isNaN(d.getTime()) ? null : d;
}
function hora(s: string | null, seg = false): string {
  const d = fecha(s);
  return d
    ? d.toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit", ...(seg ? { second: "2-digit" } : {}), hour12: false })
    : "—";
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-[var(--border-1)] bg-white", className)}>{children}</section>;
}
function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-1)] px-5 py-4">
      <h2 className="text-[15px] font-medium tracking-[-0.01em] text-black">{title}</h2>
      {right}
    </div>
  );
}
function Dot({ ok }: { ok: boolean }) {
  return <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-full", ok ? "bg-[#1fb95a]" : "bg-[#e5484d]")} />;
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-[var(--border-1)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
      {children}
    </span>
  );
}

function Sparkline({ valores }: { valores: number[] }) {
  const W = 320;
  const H = 44;
  if (valores.length < 2) {
    return <p className="font-mono text-[11px] text-[var(--fg-muted)]">reuniendo muestras…</p>;
  }
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const r = Math.max(max - min, 1);
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * W, H - 4 - ((v - min) / r) * (H - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-11 w-full" preserveAspectRatio="none" role="img" aria-label={`Latencia de Cerebras, ${valores.length} muestras`}>
      <line x1="0" x2={W} y1={H - 2} y2={H - 2} stroke="#d9d9d6" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="#0a0a0a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill="#0a0a0a" />
    </svg>
  );
}

const ETIQUETA_TIPO: Record<string, string> = { brain: "BRAIN", "v-trading": "V-TRADING", codex: "CODEX", claude: "CLAUDE", cerebras: "CEREBRAS" };

export default function FabricaPage() {
  const [estado, setEstado] = useState<Json | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [todos, setTodos] = useState(false);
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/fabrica/estado", { cache: "no-store" });
      const j: unknown = await r.json();
      if (!r.ok) throw new Error(str(obj(j).error) ?? `HTTP ${r.status}`);
      if (vivo.current) {
        setEstado(obj(j));
        setError(null);
      }
    } catch (e) {
      if (vivo.current) setError(e instanceof Error ? e.message : "sin señal");
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    void cargar();
    const id = setInterval(() => void cargar(), REFRESH_MS);
    return () => {
      vivo.current = false;
      clearInterval(id);
    };
  }, [cargar]);

  const e = estado ?? {};
  const mesh = obj(e.mesh);
  const codex = obj(e.codex);
  const vt = obj(e.vtrading);
  const v60 = obj(vt["v6.0"]);
  const v59 = obj(vt["v5.9"]);
  const brain = obj(e.brain);
  const servicios = Object.entries(obj(e.servicios)).map(([k, v]) => [k, String(v)] as const);
  const sanos = servicios.filter(([, v]) => v === "active").length;
  const latencias = useMemo(
    () => (Array.isArray(e.historia) ? e.historia : []).map((m) => num(obj(m).cerebras_ms)).filter((v): v is number => v !== null),
    [e.historia],
  );
  const eventos = useMemo<Evento[]>(
    () =>
      (Array.isArray(e.eventos) ? e.eventos : []).map((x) => {
        const o = obj(x);
        return { t: str(o.t) ?? "", tipo: str(o.tipo) ?? "", titulo: str(o.titulo) ?? "—", detalle: str(o.detalle) ?? "" };
      }),
    [e.eventos],
  );
  const tipos = useMemo(() => Array.from(new Set(eventos.map((x) => x.tipo))).filter(Boolean), [eventos]);
  const filtrados = filtro === "todos" ? eventos : eventos.filter((x) => x.tipo === filtro);
  const visibles = todos ? filtrados : filtrados.slice(0, 7);

  const cerebrasOk = str(mesh.cerebras) === "up";
  const codexOk = str(codex.sesion) === "ChatGPT Pro" && str(codex.plugin) === "activo";
  const v60Abiertas = num(v60.abiertas) ?? 0;
  const v59Net = num(v59.net_total);
  const winRate = num(v59.win_rate);

  const alianza = [
    { n: "Claude", d: "director: arquitectura y criterio", ok: true },
    { n: "Codex", d: `manos: ${str(codex.sesion) ?? "—"}, ${str(codex.plugin) ?? "—"}`, ok: codexOk },
    { n: "Cerebras", d: `obrero: ${fmtN(num(mesh.texto_ms))} ms, gpt-oss-120b / qwen-3.8-27b`, ok: cerebrasOk },
  ];

  return (
    <div className="min-h-full bg-[#f7f7f5]">
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-8 md:px-8 md:pt-12">
        {/* Encabezado */}
        <header className="mb-8 md:mb-10">
          <span className="inline-flex rounded-full border border-[var(--border-1)] bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Unicorn 1.0 · Fábrica
          </span>
          <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.6rem)] font-light leading-[0.95] tracking-[-0.045em] text-black">
            La fábrica, <span className="font-semibold">en vivo</span>
          </h1>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-1)] bg-white px-3.5 py-1.5 text-[13px]">
            <Dot ok={!error} />
            <span className={error ? "text-[#e5484d]" : "text-[#138a43]"}>{error ? "Sin señal" : "En vivo"}</span>
            <span className="text-[var(--fg-muted)]">·</span>
            <span className="tabular-nums text-black">{hora(str(e.generado))}</span>
          </span>
        </header>

        {error && !estado && (
          <Card className="mb-6 px-5 py-4">
            <p className="text-[14px] text-[var(--fg-secondary)]">No llegó el estado de la fábrica ({error}). Se reintenta solo cada 20 segundos.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Actividad en vivo */}
          <Card className="order-2 self-start lg:order-1">
            <CardHead
              title="Actividad en vivo"
              right={
                <label className="flex items-center gap-2 text-[13px] text-[var(--fg-secondary)]">
                  <span className="sr-only">Filtrar eventos</span>
                  <select
                    value={filtro}
                    onChange={(ev) => setFiltro(ev.target.value)}
                    className="cursor-pointer rounded-md border border-transparent bg-transparent py-1 pr-1 text-[13px] outline-none hover:border-[var(--border-1)] focus-visible:border-black"
                  >
                    <option value="todos">Todos los eventos</option>
                    {tipos.map((t) => (
                      <option key={t} value={t}>
                        {ETIQUETA_TIPO[t] ?? t}
                      </option>
                    ))}
                  </select>
                </label>
              }
            />
            <ol className="relative px-5 py-2">
              {visibles.length === 0 && <li className="py-6 text-[14px] text-[var(--fg-muted)]">Todavía no hay eventos.</li>}
              {visibles.map((ev, i) => (
                <li key={`${ev.t}-${i}`} className="grid grid-cols-[64px_16px_minmax(0,1fr)] gap-3 border-b border-[var(--border-1)] py-5 last:border-b-0 md:grid-cols-[72px_16px_minmax(0,1fr)_auto]">
                  <time className="pt-0.5 font-mono text-[12px] tabular-nums text-[var(--fg-muted)]">{hora(ev.t, true)}</time>
                  <span className="relative flex justify-center pt-1.5">
                    {i < visibles.length - 1 && <span aria-hidden className="absolute left-1/2 top-4 h-[calc(100%+2.5rem)] w-px -translate-x-1/2 bg-[var(--border-1)]" />}
                    <span className={cn("relative h-2 w-2 rounded-full", i === 0 ? "bg-[#1fb95a] ring-4 ring-[#1fb95a]/15" : "bg-[#c4c4c0]")} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium leading-6 text-black">{ev.titulo}</p>
                    {ev.detalle && <p className="mt-0.5 break-words text-[13px] leading-5 text-[var(--fg-secondary)]">{ev.detalle}</p>}
                  </div>
                  <span className="col-start-3 md:col-start-auto">
                    <Chip>{ETIQUETA_TIPO[ev.tipo] ?? ev.tipo}</Chip>
                  </span>
                </li>
              ))}
            </ol>
            {filtrados.length > 7 && (
              <div className="border-t border-[var(--border-1)] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setTodos((v) => !v)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-[14px] font-medium text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {todos ? "Ver menos" : `Ver toda la actividad (${filtrados.length})`}
                </button>
              </div>
            )}
          </Card>

          <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
          {/* Métricas */}
          <Card className="p-5">
            <h2 className="text-[15px] font-medium tracking-[-0.01em] text-black">Métricas en tiempo real</h2>
            <dl className="mt-4 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-[var(--border-1)]">
              {[
                ["Servicios", `${sanos}/${servicios.length || "—"}`, servicios.length > 0 && sanos === servicios.length],
                ["Memorias", fmtN(num(Number(brain.memorias))), null],
                ["v6.0 en mercado", fmtN(v60Abiertas), null],
                ["Latencia", `${fmtN(num(mesh.texto_ms))} ms`, null],
              ].map(([k, v, ok], i) => (
                <div key={String(k)} className={cn("min-w-0", i > 0 && "sm:pl-4")}>
                  <dt className="text-[12px] text-[var(--fg-secondary)]">{k}</dt>
                  <dd className="mt-1 flex items-center gap-2 text-[26px] font-medium tabular-nums tracking-[-0.03em] text-black">
                    {v}
                    {ok !== null && <Dot ok={Boolean(ok)} />}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <Sparkline valores={latencias} />
            </div>
          </Card>

          {/* Alianza */}
          <Card>
            <CardHead title="La alianza" />
            <ul className="px-5">
              {alianza.map((a) => (
                <li key={a.n} className="flex items-center gap-3 border-b border-[var(--border-1)] py-3.5 last:border-b-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border-1)] bg-[#f7f7f5] text-[14px] font-medium">
                    {a.n[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-black">{a.n}</span>
                    <span className="block truncate text-[13px] text-[var(--fg-secondary)]">{a.d}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--fg-secondary)]">
                    <Dot ok={a.ok} /> {a.ok ? "En vivo" : "Caído"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* V-Trading */}
          <Card>
            <CardHead
              title="V-Trading"
              right={<span className="text-[13px] text-[var(--fg-muted)]">modo papel</span>}
            />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-5">
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--fg-secondary)]">v6.0</p>
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
                <p className="text-[13px] text-[var(--fg-secondary)]">v5.9</p>
                <p className="mt-1 text-[30px] font-medium tabular-nums tracking-[-0.03em] text-black">{fmtN(num(v59.cerradas))}</p>
                <p className="text-[13px] text-[var(--fg-secondary)]">cerradas</p>
                <p className={cn("mt-2 text-[15px] tabular-nums", v59Net !== null && v59Net < 0 ? "text-[#e5484d]" : "text-[#138a43]")}>{fmtUsd(v59Net)}</p>
                <p className="text-[13px] text-[var(--fg-secondary)]">{winRate === null ? "—" : `${fmtN(winRate * 100, 1)}% ganadoras`}</p>
              </div>
            </div>
          </Card>

          {/* Servicios */}
          <Card>
            <CardHead title="Servicios" right={<span className="text-[13px] tabular-nums text-[var(--fg-muted)]">{sanos}/{servicios.length}</span>} />
            <ul className="grid grid-cols-1 gap-x-6 px-5 py-2 sm:grid-cols-2">
              {servicios.length === 0 && <li className="py-3 text-[13px] text-[var(--fg-muted)]">—</li>}
              {servicios.map(([n, v]) => (
                <li key={n} className="flex items-center justify-between gap-3 border-b border-[var(--border-1)] py-2.5 text-[14px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Dot ok={v === "active"} />
                    <span className="truncate text-black">{n}</span>
                  </span>
                  <span className={cn("shrink-0 text-[12px]", v === "active" ? "text-[var(--fg-secondary)]" : "text-[#e5484d]")}>
                    {v === "active" ? "En vivo" : "Caído"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          </div>
        </div>

        <p className="mt-8 font-mono text-[11px] text-[var(--fg-muted)]">
          Colector en {fmtN(num(e.colector_ms))} ms · se actualiza cada 20 s · Claude dirige · Codex construye · Cerebras carga
        </p>
      </div>
    </div>
  );
}
