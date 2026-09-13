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
    console.error("[falla-raiz]", error?.digest ?? "sin-digest", error?.message);
  }, [error]);

  return (
    <FallaPantalla
      titulo="Esta pantalla falló."
      explicacion="El resto de VForge sigue en pie y nada de tu trabajo se perdió. Reintenta, o vuelve al inicio."
      reintentar={reset}
      salida={{ href: "/", texto: "Ir al inicio" }}
      detalle={[error?.message, error?.digest ? "digest: " + error.digest : null]
        .filter(Boolean)
        .join("\n")}
    />
  );
}
