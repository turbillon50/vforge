"use client";

/**
 * /app/fabrica — La fábrica en vivo (Unicorn 1.0).
 * Refleja en tiempo real lo que pasa en la casa: la alianza (Claude dirige,
 * Codex construye, Cerebras carga), V-Trading en papel, servicios y Brain.
 * Fuente: /api/fabrica/estado (owner-only), que lee el colector del Hetzner.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { cn } from "@/lib/utils";

const REFRESH_MS = 20_000;
const TZ = "America/Cancun";

type Json = Record<string, unknown>;
type Muestra = { t: string; cerebras_ms: number | null; sanos: number; total: number };

function obj(v: unknown): Json {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
function fmtN(v: number | null, dec = 0): string {
  return v === null ? "—" : v.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtUsd(v: number | null): string {
  if (v === null) return "—";
  const s = Math.abs(v).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? "−$" : "$") + s;
}
function horaCancun(iso: string | null, conFecha = false): string {
  if (!iso) return "—";
  const d = new Date(iso.includes(" UTC") ? iso.replace(/^\w{3} /, "").replace(" UTC", "Z").replace(" ", "T") : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    ...(conFecha ? { day: "numeric", month: "short" } : {}),
  });
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">{children}</p>;
}

function Tarjeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-[var(--border-1)] bg-white p-5 md:p-6", className)}>
      {children}
    </section>
  );
}

function Pulso({ muestras }: { muestras: Muestra[] }) {
  const puntos = muestras.map((m) => m.cerebras_ms).filter((v): v is number => v !== null);
  const W = 1000;
  const H = 160;
  let d = `M0 ${H / 2} L${W * 0.42} ${H / 2} L${W * 0.46} ${H * 0.2} L${W * 0.5} ${H * 0.85} L${W * 0.54} ${H / 2} L${W} ${H / 2}`;
  let ultimo = { x: W, y: H / 2 };
  if (puntos.length >= 2) {
    const min = Math.min(...puntos);
    const max = Math.max(...puntos);
    const rango = Math.max(max - min, 1);
    const pts = puntos.map((v, i) => ({
      x: (i / (puntos.length - 1)) * W,
      y: H - 16 - ((v - min) / rango) * (H - 32),
    }));
    d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    ultimo = pts[pts.length - 1];
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-32 w-full md:h-40"
      role="img"
      aria-label={
        puntos.length >= 2
          ? `Latencia de Cerebras en las últimas ${puntos.length} muestras`
          : "Reuniendo muestras de latencia"
      }
    >
      <defs>
        <linearGradient id="fundido" x1="0" x2="1">
          <stop offset="0" stopColor="#ff3d00" />
          <stop offset=".6" stopColor="#ff8a00" />
          <stop offset="1" stopColor="#ffd166" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#fundido)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={ultimo.x} cy={ultimo.y} r="5" fill="#ffd166" className="motion-safe:animate-pulse" />
    </svg>
  );
}

function Nodo({ rol, nombre, lineas, vivo }: { rol: string; nombre: string; lineas: string[]; vivo: boolean }) {
  return (
    <div
      className={cn(
        "relative min-w-0 rounded-2xl border p-5",
        vivo ? "border-black/10 bg-[#0b0b0c] text-white" : "border-red-300 bg-red-50 text-red-900",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute right-4 top-4 h-2.5 w-2.5 rounded-full",
          vivo ? "bg-[#3ddc97] motion-safe:animate-pulse" : "bg-red-500",
        )}
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-60">{rol}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">{nombre}</p>
      <ul className="mt-3 space-y-1 text-[13px] opacity-80">
        {lineas.map((l) => (
          <li key={l} className="break-words">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FabricaPage() {
  const [estado, setEstado] = useState<Json | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
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
    const a = setInterval(() => void cargar(), REFRESH_MS);
    const b = setInterval(() => setAhora(Date.now()), 1000);
    return () => {
      vivo.current = false;
      clearInterval(a);
      clearInterval(b);
    };
  }, [cargar]);

  const e = estado ?? {};
  const mesh = obj(e.mesh);
  const codex = obj(e.codex);
  const vt = obj(e.vtrading);
  const v60 = obj(vt["v6.0"]);
  const v59 = obj(vt["v5.9"]);
  const brain = obj(e.brain);
  const carta = obj(e.carta);
  const mensaje = obj(e.mensaje);
  const servicios = Object.entries(obj(e.servicios)).map(([k, v]) => [k, String(v)] as const);
  const historia = useMemo<Muestra[]>(
    () =>
      (Array.isArray(e.historia) ? e.historia : []).map((m) => {
        const o = obj(m);
        return { t: str(o.t) ?? "", cerebras_ms: num(o.cerebras_ms), sanos: num(o.sanos) ?? 0, total: num(o.total) ?? 0 };
      }),
    [e.historia],
  );
  const sanos = servicios.filter(([, v]) => v === "active").length;
  const recientes = (Array.isArray(brain.recientes) ? brain.recientes : []).map((r) => obj(r));
  const cerebrasVivo = str(mesh.cerebras) === "up";
  const codexVivo = str(codex.sesion) === "ChatGPT Pro" && str(codex.plugin) === "activo";

  const sig = str(vt.siguiente_revision_v6);
  const sigMs = sig ? new Date(sig.replace(/^\w{3} /, "").replace(" UTC", "Z").replace(" ", "T")).getTime() : NaN;
  const faltan = Number.isFinite(sigMs) ? Math.max(0, Math.floor((sigMs - ahora) / 1000)) : null;
  const cuenta =
    faltan === null ? "—" : faltan === 0 ? "revisando…" : `${String(Math.floor(faltan / 60)).padStart(2, "0")}:${String(faltan % 60).padStart(2, "0")}`;

  const v60Abiertas = num(v60.abiertas) ?? 0;
  const v60Cerradas = num(v60.cerradas) ?? 0;
  const v59Net = num(v59.net_total);

  return (
    <>
      <PageHeader
        eyebrow="UNICORN 1.0 · LA FÁBRICA"
        title="La fábrica en vivo"
        description="Lo que pasa en la casa, en tiempo real: quién dirige, quién construye, quién carga, y cómo va cada frente."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-1)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span className={cn("h-2 w-2 rounded-full", error ? "bg-red-500" : "bg-[#3ddc97] motion-safe:animate-pulse")} />
            {error ? "sin señal" : `en vivo · ${horaCancun(str(e.generado))}`}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-12 md:px-8 md:py-8">
        {error && !estado && (
          <Tarjeta className="md:col-span-12">
            <p className="text-[14px] text-[var(--fg-secondary)]">
              No llegó el estado de la fábrica ({error}). Se reintenta solo cada 20 segundos.
            </p>
          </Tarjeta>
        )}

        <section className="relative overflow-hidden rounded-2xl bg-[#050505] p-6 text-[#f3efe9] md:col-span-12 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,110,0,.28),transparent_65%)]"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8d877f]">Pulso de Cerebras · latencia real por minuto</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] md:text-[64px]">{fmtN(num(mesh.texto_ms))}</span>
            <span className="mb-1 font-mono text-[12px] text-[#8d877f]">ms</span>
          </div>
          <div className="mt-4">
            <Pulso muestras={historia} />
          </div>
          {historia.length < 2 && <p className="font-mono text-[11px] text-[#8d877f]">reuniendo muestras…</p>}
        </section>

        {str(carta.texto) && (
          <Tarjeta className="md:col-span-8">
            <Etiqueta>Carta de Vulcano</Etiqueta>
            <blockquote className="mt-3 border-l-2 border-[#ff6a00] pl-4 font-serif text-[20px] italic leading-8 text-black md:text-[24px] md:leading-9">
              {str(carta.texto)}
            </blockquote>
            <p className="mt-3 font-mono text-[11px] text-[var(--fg-muted)]">{str(carta.autor) ?? "—"}</p>
          </Tarjeta>
        )}

        <Tarjeta className={str(carta.texto) ? "md:col-span-4" : "md:col-span-12"}>
          <Etiqueta>Mensaje del día · Cerebras</Etiqueta>
          <p className="mt-3 text-[16px] leading-7 text-black">{str(mensaje.texto) ?? "—"}</p>
          <p className="mt-3 font-mono text-[11px] text-[var(--fg-muted)]">
            {str(mensaje.autor) ?? "—"} · {fmtN(num(mensaje.ms))} ms
          </p>
        </Tarjeta>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-12">
          <Nodo rol="Director" nombre="Claude" lineas={["arquitectura · criterio", "Brain y decisiones"]} vivo />
          <Nodo
            rol="Manos"
            nombre="Codex"
            lineas={[`sesión: ${str(codex.sesion) ?? "—"}`, `plugin: ${str(codex.plugin) ?? "—"}`]}
            vivo={codexVivo}
          />
          <Nodo
            rol="Obrero"
            nombre="Cerebras"
            lineas={[`${fmtN(num(mesh.texto_ms))} ms · ${str(mesh.cerebras) ?? "—"}`, "gpt-oss-120b", "qwen-3.8-27b (visión)"]}
            vivo={cerebrasVivo}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:col-span-12 md:grid-cols-4">
          {[
            ["Servicios sanos", `${sanos}/${servicios.length || "—"}`],
            ["Memorias del Brain", fmtN(num(Number(brain.memorias)))],
            ["v6.0 en mercado", fmtN(v60Abiertas)],
            ["v5.9 cerradas", fmtN(num(v59.cerradas))],
          ].map(([k, v]) => (
            <Tarjeta key={k}>
              <Etiqueta>{k}</Etiqueta>
              <p className="mt-2 font-mono text-[28px] font-medium tabular-nums tracking-[-0.03em] text-black md:text-[34px]">{v}</p>
            </Tarjeta>
          ))}
        </div>

        <Tarjeta className="md:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <Etiqueta>V-Trading · modo papel</Etiqueta>
            <span className="font-mono text-[11px] text-[var(--fg-muted)]">próxima revisión {cuenta}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[22px] font-semibold tracking-[-0.03em]">v6.0</p>
                {v60Abiertas > 0 && (
                  <span className="rounded-full bg-[#ff6a00] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white motion-safe:animate-pulse">
                    en mercado
                  </span>
                )}
              </div>
              <dl className="mt-3 space-y-2 font-mono text-[13px]">
                <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Abiertas</dt><dd>{fmtN(v60Abiertas)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Cerradas</dt><dd>{fmtN(v60Cerradas)}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-[var(--fg-muted)]">Neto</dt>
                  <dd>{v60Cerradas ? fmtUsd(num(v60.net_total)) : "—"}</dd>
                </div>
              </dl>
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-semibold tracking-[-0.03em]">v5.9</p>
              <dl className="mt-3 space-y-2 font-mono text-[13px]">
                <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">Cerradas</dt><dd>{fmtN(num(v59.cerradas))}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-[var(--fg-muted)]">Neto</dt>
                  <dd className={cn(v59Net !== null && (v59Net < 0 ? "text-red-600" : "text-emerald-600"))}>{fmtUsd(v59Net)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--fg-muted)]">Ganadoras</dt>
                  <dd>{num(v59.win_rate) === null ? "—" : `${fmtN((num(v59.win_rate) ?? 0) * 100, 1)}%`}</dd>
                </div>
              </dl>
              {num(v59.fee_bite_ratio) !== null && (
                <p className="mt-3 text-[12px] leading-5 text-[var(--fg-secondary)]">
                  Las comisiones se comen {fmtN(num(v59.fee_bite_ratio), 2)}× el bruto. Por eso nació la v6.0.
                </p>
              )}
            </div>
          </div>
        </Tarjeta>

        <Tarjeta className="md:col-span-5">
          <Etiqueta>Servicios de la casa</Etiqueta>
          <ul className="mt-3 divide-y divide-[var(--border-1)]">
            {servicios.length === 0 && <li className="py-2 text-[13px] text-[var(--fg-muted)]">—</li>}
            {servicios.map(([n, v]) => (
              <li key={n} className="flex items-center justify-between gap-3 py-2 font-mono text-[13px]">
                <span className="min-w-0 truncate">{n}</span>
                <span className={cn("inline-flex items-center gap-2", v === "active" ? "text-emerald-700" : "text-red-600")}>
                  <span className={cn("h-2 w-2 rounded-full", v === "active" ? "bg-emerald-500" : "bg-red-500")} />
                  {v === "active" ? "activo" : "caído"}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta className="md:col-span-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Etiqueta>Brain · últimas memorias</Etiqueta>
            <span className="font-mono text-[12px] text-[var(--fg-muted)]">
              {fmtN(num(Number(brain.memorias)))} memorias · última #{str(String(brain.ultima ?? "")) ?? "—"}
            </span>
          </div>
          <ol className="mt-3 grid grid-cols-1 gap-x-8 md:grid-cols-2">
            {recientes.map((r) => (
              <li key={String(r.id)} className="flex gap-3 border-b border-[var(--border-1)] py-2 text-[13px]">
                <span className="font-mono text-[#e25500]">{String(r.id ?? "—")}</span>
                <span className="min-w-0 break-words">{str(r.tema) ?? "—"}</span>
              </li>
            ))}
          </ol>
        </Tarjeta>

        <p className="px-1 font-mono text-[11px] text-[var(--fg-muted)] md:col-span-12">
          Colector en {fmtN(num(e.colector_ms))} ms · se actualiza cada 20 s · Claude dirige · Codex construye · Cerebras carga
        </p>
      </div>
    </>
  );
}
