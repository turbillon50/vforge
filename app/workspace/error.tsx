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
      titulo="Esta vista del workspace falló."
      explicacion="Tus proyectos y conexiones están intactos. Reintenta para volver a pedirla."
      reintentar={reset}
      salida={{ href: "/workspace", texto: "Volver al workspace" }}
      detalle={[error?.message, error?.digest ? "digest: " + error.digest : null]
        .filter(Boolean)
        .join("\n")}
    />
  );
}
