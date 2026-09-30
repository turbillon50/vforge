"use client";

import { useEffect } from "react";
import { reloadChunkErrorOnce } from "@/components/system/reload-chunk-once";

/**
 * Última red: aquí ni el layout raíz cargó, así que no hay tokens de tema ni
 * fuentes. Todo va en estilos en línea, a propósito, para que esta pantalla
 * no dependa de nada que se pueda haber roto.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (reloadChunkErrorOnce(error)) return;
    console.error("[falla-global]", error?.digest ?? "sin-digest", error?.message);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#FFFFFF",
          color: "#0A0A0A",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 440 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 3,
              borderRadius: 999,
              background: "#0A0A0A",
              opacity: 0.5,
              marginBottom: 20,
            }}
          />
          <h1
            style={{
              fontSize: 22,
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            VForge no pudo arrancar.
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.6, color: "#52525B" }}>
            Se rompió algo antes de que cargara la aplicación. No se perdió nada de
            lo tuyo: recargar casi siempre basta.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: 8,
                padding: "10px 18px",
                background: "#0A0A0A",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Recargar
            </button>
            <a
              href="/"
              style={{
                borderRadius: 8,
                padding: "10px 18px",
                border: "1px solid #E8E8E8",
                color: "#0A0A0A",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Ir al inicio
            </a>
          </div>
          {error?.digest ? (
            <p
              style={{
                marginTop: 20,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: "#71717A",
              }}
            >
              digest: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
