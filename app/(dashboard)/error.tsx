"use client";

import { useEffect } from "react";
import { FallaPantalla } from "@/components/system/FallaPantalla";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en los logs de Vercel con su digest, para poder rastrearlo después.
    console.error("[falla]", error?.digest ?? "sin-digest", error?.message);
  }, [error]);

  return (
    <FallaPantalla
      titulo="Esta herramienta no abrió."
      explicacion="Nada de lo tuyo cambió. Reintenta, o pasa al Estudio mientras tanto."
      reintentar={reset}
      salida={{ href: "/app/chat", texto: "Ir al Estudio" }}
      detalle={[error?.message, error?.digest ? "digest: " + error.digest : null]
        .filter(Boolean)
        .join("\n")}
    />
  );
}
