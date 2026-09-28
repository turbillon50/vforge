"use client";

import { cn } from "@/lib/utils";
import { IconLoader } from "@/components/brand/VFIcons";
import type { EstadoMotor } from "@/components/studio/vivo/useMotorVivo";

/**
 * Barra del motor vivo: elegir proyecto, encender/apagar, y ver la verdad
 * (qué slot, cuánto lleva sin uso, cuántos vivos de los 3 que caben).
 */
export function BarraVivo({
  encendido,
  fase,
  proyecto,
  setProyecto,
  motor,
  error,
  disponible,
  onEncender,
  onApagar,
}: {
  encendido: boolean;
  fase: "apagado" | "arrancando" | "vivo" | "error";
  proyecto: string;
  setProyecto: (valor: string) => void;
  motor: EstadoMotor | null;
  error: string | null;
  disponible: boolean | null;
  onEncender: (proyecto: string) => void;
  onApagar: () => void;
}) {
  if (disponible === false) {
    return (
      <div className="flex min-h-9 items-center gap-2 border-b border-[var(--vf-border)] bg-[var(--vf-bg-2)] px-page-sm py-1.5 md:px-page-md">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--vf-fg-2)]" />
        <p className="text-[11px] leading-4 text-[var(--vf-fg-2)]">
          Motor vivo no disponible. {error ?? "Revisa vf-vivo en el Hetzner."} Las vistas siguen
          mostrando el último deploy.
        </p>
      </div>
    );
  }

  const proyectos = motor?.proyectos ?? [];
  const vivos = motor?.slots.filter((s) => s.vivo).length ?? 0;
  const mio = motor?.slots.find((s) => s.proyecto === proyecto) ?? null;

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--vf-border)] bg-[var(--vf-bg-2)] px-page-sm py-1.5 md:px-page-md">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            fase === "vivo" && "bg-[var(--vf-green)]",
            fase === "arrancando" && "animate-pulse bg-[var(--vf-fg-1)]",
            fase === "error" && "bg-[var(--vf-error)]",
            fase === "apagado" && "bg-[var(--vf-fg-2)]",
          )}
        />
        <span className="font-mono text-label-caps uppercase text-[var(--vf-fg-2)]">
          Motor vivo
        </span>
      </div>

      <select
        value={proyecto}
        onChange={(event) => setProyecto(event.target.value)}
        disabled={fase === "arrancando" || encendido}
        aria-label="Proyecto del motor vivo"
        className="h-7 max-w-[190px] rounded-md border border-[var(--vf-border-1)] bg-[var(--vf-bg-1)] px-2 text-[11px] text-[var(--vf-fg)] disabled:opacity-55"
      >
        <option value="">Elige proyecto…</option>
        {proyectos.map((nombre) => (
          <option key={nombre} value={nombre}>
            {nombre}
          </option>
        ))}
      </select>

      {encendido ? (
        <button
          type="button"
          onClick={onApagar}
          className="h-7 rounded-md border border-[var(--vf-border-1)] px-2.5 text-[11px] font-medium hover:border-[var(--vf-fg)]"
        >
          Apagar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onEncender(proyecto)}
          disabled={!proyecto || fase === "arrancando"}
          className="vf-press inline-flex h-7 items-center gap-1.5 rounded-md bg-[var(--vf-fg)] px-2.5 text-[11px] font-medium text-[var(--vf-bg-1)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          {fase === "arrancando" ? (
            <>
              <IconLoader size={10} className="animate-spin" /> Encendiendo…
            </>
          ) : (
            "Encender"
          )}
        </button>
      )}

      <p className="min-w-0 flex-1 truncate text-[11px] leading-4 text-[var(--vf-fg-2)]">
        {fase === "error" && error ? (
          <span className="text-[var(--vf-fg-1)]">{error}</span>
        ) : fase === "vivo" && mio ? (
          <>
            {mio.id} · sin deploy · se apaga tras {motor?.ocioMin ?? 20} min sin uso
            {typeof mio.ociosoSeg === "number" ? ` (${mio.ociosoSeg}s de ocio)` : ""}
          </>
        ) : fase === "arrancando" ? (
          "Levantando el dev server en el Hetzner…"
        ) : (
          <>
            Apagado. Las vistas muestran el último deploy. {vivos}/{motor?.maxSlots ?? 3} vivos.
          </>
        )}
      </p>
    </div>
  );
}
