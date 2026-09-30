"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encargoAbierto, type EncargoV } from "@/components/studio/vivo/encargos-tipos";
import type { ElementoSeleccionado } from "@/components/studio/vivo/useCapaEdicion";

/**
 * Encargos de V para un proyecto vivo: mandar uno y seguirlo hasta que cierre.
 * Mientras haya alguno abierto se consulta cada 4 s; cuando uno cierra con
 * commit se avisa (`onCerrado`) para recargar la vista y las otras ventanas.
 */
export function useEncargos(proyecto: string | null, onCerrado?: (e: EncargoV) => void) {
  const [encargos, setEncargos] = useState<EncargoV[]>([]);
  const [enviando, setEnviando] = useState(false);
  const abiertos = useRef<Set<number>>(new Set());
  const avisar = useRef(onCerrado);
  avisar.current = onCerrado;

  const refrescar = useCallback(async () => {
    if (!proyecto) return;
    try {
      const r = await fetch(`/api/vivo/encargo?proyecto=${encodeURIComponent(proyecto)}`, { cache: "no-store" });
      if (!r.ok) return;
      const datos = (await r.json()) as { encargos?: EncargoV[] };
      const lista = datos.encargos ?? [];
      for (const e of lista) {
        if (abiertos.current.has(e.id) && !encargoAbierto(e)) {
          abiertos.current.delete(e.id);
          if (e.commit) avisar.current?.(e);
        } else if (encargoAbierto(e)) {
          abiertos.current.add(e.id);
        }
      }
      setEncargos(lista);
    } catch {
      /* sin red: se reintenta en el siguiente turno */
    }
  }, [proyecto]);

  useEffect(() => {
    setEncargos([]);
    abiertos.current = new Set();
    void refrescar();
  }, [refrescar]);

  const hayAbiertos = encargos.some(encargoAbierto);
  useEffect(() => {
    if (!hayAbiertos) return;
    const t = window.setInterval(() => void refrescar(), 4000);
    return () => window.clearInterval(t);
  }, [hayAbiertos, refrescar]);

  /** Devuelve null si entró a la cola, o el motivo si no. */
  const encargar = useCallback(
    async (pedido: string, el: ElementoSeleccionado): Promise<string | null> => {
      if (!proyecto) return "El motor vivo no está encendido.";
      setEnviando(true);
      try {
        const r = await fetch("/api/vivo/encargo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            proyecto,
            pedido,
            elemento: { src: el.src, etiqueta: el.etiqueta, texto: el.texto },
          }),
        });
        const datos = (await r.json().catch(() => ({}))) as { encargo?: number; error?: string };
        if (!r.ok || !datos.encargo) return datos.error ?? `No entró el encargo (HTTP ${r.status}).`;
        abiertos.current.add(datos.encargo);
        await refrescar();
        return null;
      } catch {
        return "Sin conexión con VForge.";
      } finally {
        setEnviando(false);
      }
    },
    [proyecto, refrescar],
  );

  return { encargos, enviando, encargar, refrescar };
}
