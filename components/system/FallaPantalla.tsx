"use client";

import { useState } from "react";

/**
 * La pantalla que se ve cuando algo truena.
 *
 * Tres cosas que tiene que lograr, en este orden:
 *   1. Decir la verdad de qué se cayó y qué NO se cayó (nadie confía en un
 *      sistema que finge que no pasó nada).
 *   2. Dejar una salida a un clic. Nunca un callejón.
 *   3. Guardar el detalle técnico a la mano, plegado, para cuando haga falta.
 */
export function FallaPantalla({
  titulo,
  explicacion,
  reintentar,
  salida = { href: "/app/chat", texto: "Ir al Estudio" },
  detalle,
}: {
  titulo: string;
  explicacion: string;
  reintentar?: () => void;
  salida?: { href: string; texto: string } | null;
  detalle?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 py-16">
      <div className="w-full max-w-[460px]">
        <div
          aria-hidden="true"
          className="mb-5 h-[3px] w-10 rounded-full bg-[var(--fg-muted,#71717A)] opacity-60"
        />
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em]">
          {titulo}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--fg-muted,#71717A)]">
          {explicacion}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {reintentar ? (
            <button
              type="button"
              onClick={reintentar}
              className="inline-flex items-center rounded-lg bg-[var(--fg,#0A0A0A)] px-4 py-2 text-[14px] font-semibold text-[var(--bg,#FFF)]"
            >
              Reintentar
            </button>
          ) : null}
          {salida ? (
            <a
              href={salida.href}
              className="inline-flex items-center rounded-lg border border-[var(--line,#E8E8E8)] px-4 py-2 text-[14px] font-medium"
            >
              {salida.texto}
            </a>
          ) : null}
        </div>

        {detalle ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted,#71717A)] underline underline-offset-4"
            >
              {abierto ? "Ocultar detalle técnico" : "Ver detalle técnico"}
            </button>
            {abierto ? (
              <pre className="mt-3 max-h-52 overflow-auto rounded-lg border border-[var(--line,#E8E8E8)] p-3 font-mono text-[11px] leading-relaxed">
                {detalle}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
