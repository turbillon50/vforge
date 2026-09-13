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
      titulo="Esta pantalla no cargó."
      explicacion="El resto de VForge sigue de pie. Reintenta aquí mismo; si insiste, entra por otro lado."
      reintentar={reset}
      salida={{ href: "/", texto: "Ir al inicio" }}
      detalle={[error?.message, error?.digest ? "digest: " + error.digest : null]
        .filter(Boolean)
        .join("\n")}
    />
  );
}
