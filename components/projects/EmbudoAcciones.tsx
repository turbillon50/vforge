"use client";

import { useCallback, useEffect, useState } from "react";

type Senal = {
  id: string;
  tipo: "pendiente" | "oportunidad" | "riesgo";
  titulo: string;
  detalle: string | null;
  prioridad: string;
  created_at: string;
  raw: { senal?: string; accion_sugerida?: string; confianza?: number } | null;
};

const ACCION: Record<string, string> = {
  generar_contrato: "Generar contrato",
  ajustar_demo: "Ajustar la demo",
  responder: "Responderle",
  seguimiento: "Darle seguimiento",
};

const TONO: Record<Senal["tipo"], string> = {
  oportunidad: "border-[#22c55e] bg-[#22c55e]/10 text-[#166534]",
  pendiente: "border-[var(--border-1)] bg-[var(--color-surface-2)] text-black",
  riesgo: "border-[#ef4444] bg-[#ef4444]/10 text-[#991b1b]",
};

function cuando(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Lo que el cliente va diciendo (señales del chat en vivo) y el botón para pedirle el contrato a LUTOR.
 */
export function EmbudoAcciones({
  projectId,
  etapa,
  contratoUrl,
}: {
  projectId: string;
  etapa: string | null;
  contratoUrl: string | null;
}) {
  const [senales, setSenales] = useState<Senal[]>([]);
  const [vivos, setVivos] = useState<{ n: number; ultimo: string | null } | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(contratoUrl);
  const [analizando, setAnalizando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/senales`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { senales: Senal[]; vivos: { n: number; ultimo: string | null } | null };
    setSenales(data.senales ?? []);
    setVivos(data.vivos);
  }, [projectId]);

  useEffect(() => {
    const first = setTimeout(() => void cargar(), 0);
    const id = setInterval(() => void cargar(), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [cargar]);

  async function analizar() {
    setAnalizando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/senales`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      await cargar();
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo analizar.");
    } finally {
      setAnalizando(false);
    }
  }

  async function generar() {
    setBusy(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/contrato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto_total: monto, notas }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; detalle?: string; contrato?: { url: string; faltantes?: string[] } }
        | null;
      if (!res.ok || !data?.contrato) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setUrl(data.contrato.url);
      setAbierto(false);
      setAviso(
        data.contrato.faltantes?.length
          ? `Contrato listo. Revisa lo que falta: ${data.contrato.faltantes.join(", ")}.`
          : "Contrato listo y el proyecto pasó a Contrato enviado.",
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo generar el contrato.");
    } finally {
      setBusy(false);
    }
  }

  const sugiereContrato = senales.some((s) => s.raw?.accion_sugerida === "generar_contrato");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border-1)] p-4">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--fg-muted)]">Contrato (LUTOR)</p>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[14px] font-semibold text-black hover:underline">
              {url}
            </a>
          ) : (
            <p className="mt-1 text-[14px] font-semibold text-black">
              {sugiereContrato ? "El cliente ya pidió formalizar" : "Aún sin contrato"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className={`min-h-11 rounded-md border px-4 text-[13px] font-semibold ${
            sugiereContrato && !url ? "border-black bg-black text-white" : "border-[var(--border-1)] bg-white text-black hover:border-black"
          }`}
        >
          {url ? "Regenerar contrato" : "Generar contrato con LUTOR"}
        </button>
      </div>

      {abierto ? (
        <div className="grid gap-3 rounded-md border border-black p-4 md:grid-cols-[200px_1fr_auto] md:items-end">
          <label className="grid gap-1 text-[12px] text-[var(--fg-muted)]">
            Monto total (MXN)
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              inputMode="numeric"
              placeholder="ej. 25000"
              className="h-11 rounded-md border border-[var(--border-1)] px-3 text-[14px] text-black"
            />
          </label>
          <label className="grid gap-1 text-[12px] text-[var(--fg-muted)]">
            Notas para el abogado (alcance, plazos, lo acordado)
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="ej. 50% anticipo, entrega en 3 semanas, incluye panel admin y PWA"
              className="h-11 rounded-md border border-[var(--border-1)] px-3 text-[14px] text-black"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void generar()}
            className="min-h-11 rounded-md border border-black bg-black px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "LUTOR redactando…" : "Generar"}
          </button>
          <p className="text-[12px] text-[var(--fg-muted)] md:col-span-3">
            Usa la plantilla oficial contrato-pwa. Lo que no esté capturado queda marcado como [FALTA] para que lo revises antes de mandarlo.
            Etapa actual: {etapa ?? "sin etapa"}.
          </p>
        </div>
      ) : null}

      {aviso ? <p className="text-[13px] text-black">{aviso}</p> : null}

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[12px] font-medium text-black">Lo que dice el cliente (en vivo)</p>
            <button
              type="button"
              disabled={analizando}
              onClick={() => void analizar()}
              className="rounded-md border border-[var(--border-1)] px-2 py-1 text-[11px] font-semibold text-black hover:border-black disabled:opacity-50"
            >
              {analizando ? "Leyendo…" : "Analizar ahora"}
            </button>
          </div>
          <p className="font-mono text-[11px] text-[var(--fg-muted)]">
            {vivos?.n ? `${vivos.n} mensajes en vivo · último ${vivos.ultimo ? cuando(vivos.ultimo) : "—"}` : "sin mensajes en vivo todavía"}
          </p>
        </div>
        {senales.length ? (
          senales.map((s) => (
            <div key={s.id} className={`rounded-md border p-3 ${TONO[s.tipo]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-semibold">{s.titulo}</p>
                <p className="font-mono text-[11px] opacity-70">{cuando(s.created_at)}</p>
              </div>
              {s.detalle ? <p className="mt-1 text-[13px] leading-5 opacity-90">{s.detalle}</p> : null}
              {s.raw?.accion_sugerida && ACCION[s.raw.accion_sugerida] ? (
                <p className="mt-2 text-[12px] font-semibold">→ {ACCION[s.raw.accion_sugerida]}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-[var(--border-1)] p-3 text-[13px] text-[var(--fg-muted)]">
            Cuando el cliente escriba en un chat con “Seguir en vivo” encendido, aquí aparece qué significa y qué sigue.
          </p>
        )}
      </div>
    </div>
  );
}
