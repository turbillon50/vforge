"use client";

/**
 * Colectivo — el chat real de la casa (Trío, V, Fábrica; GLM, Claude, ChatGPT, Cerebras, GPU y todos
 * los MCP) adentro de VForge. Se entra con la cuenta de VForge: el servidor firma un pase y el chat
 * abre su propia sesión. A la derecha, opcional, VForge en vivo para ver los cambios al instante.
 */
import { useCallback, useEffect, useState } from "react";

const VIVO_URL = "https://vivo.vforge.site";

export function ColectivoStudio() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vivo, setVivo] = useState(true);

  const abrir = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/colectivo/pase", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setUrl(d.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "sin_conexion");
    }
  }, []);

  useEffect(() => {
    void abrir();
  }, [abrir]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] px-4 py-2">
        <p className="text-sm text-[var(--fg-muted)]">
          Trío · V · Fábrica — con todos los modelos y la infraestructura de la casa
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVivo((v) => !v)}
            className="hidden rounded-lg border border-[var(--border-1)] px-3 py-1.5 text-xs font-medium md:inline-flex"
          >
            {vivo ? "Ocultar VForge en vivo" : "Ver VForge en vivo"}
          </button>
          <a
            href={url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--border-1)] px-3 py-1.5 text-xs font-medium"
          >
            Abrir aparte
          </a>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 flex-1">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-[var(--fg-primary)]">No pude abrir el chat del colectivo ({error}).</p>
              <button type="button" onClick={abrir} className="rounded-lg bg-[var(--vf-violet,#7c3aed)] px-4 py-2 text-sm font-medium text-white">
                Reintentar
              </button>
            </div>
          ) : url ? (
            <iframe
              title="Chat del colectivo"
              src={url}
              className="h-full w-full border-0"
              allow="clipboard-read; clipboard-write; microphone"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--fg-muted)]">Abriendo el chat del colectivo…</div>
          )}
        </div>
        {vivo && (
          <div className="hidden min-h-0 w-[44%] border-l border-[var(--border-1)] md:block">
            <iframe title="VForge en vivo" src={VIVO_URL} className="h-full w-full border-0" />
          </div>
        )}
      </div>
    </div>
  );
}
