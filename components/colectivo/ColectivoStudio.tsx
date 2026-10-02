"use client";

/**
 * Colectivo — el chat real de la casa (Trío, V, Fábrica; GLM, Claude, ChatGPT, Cerebras, GPU y todos
 * los MCP) adentro de VForge, a pantalla completa y sin nada encima. Se entra con la cuenta de VForge:
 * el servidor firma un pase y el chat abre su propia sesión.
 */
import { useCallback, useEffect, useState } from "react";

export function ColectivoStudio() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-[var(--fg-primary)]">No pude abrir el chat del colectivo ({error}).</p>
        <button type="button" onClick={abrir} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
          Reintentar
        </button>
      </div>
    );
  }
  if (!url) {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--fg-muted)]">Abriendo el colectivo…</div>;
  }
  return (
    <iframe
      title="Colectivo"
      src={url}
      className="h-full w-full border-0"
      allow="clipboard-read; clipboard-write; microphone"
    />
  );
}
