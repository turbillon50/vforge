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
  editando,
  onEditando,
  marcados,
  verControl,
  onVerControl,
  selector,
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
  editando: boolean;
  onEditando: (valor: boolean) => void;
  marcados: number | null;
  verControl: boolean;
  onVerControl: (valor: boolean) => void;
  /**
   * En la sala de un proyecto el combo NO elige qué encender: cambia de proyecto
   * (navega). El motor siempre es el del proyecto abierto.
   */
  selector?: {
    actual: string;
    opciones: { id: string; name: string }[];
    onCambiar: (id: string) => void;
  };
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

      {selector ? (
        <select
          value={selector.actual}
          onChange={(event) => selector.onCambiar(event.target.value)}
          aria-label="Cambiar de proyecto"
          className="h-7 max-w-[240px] rounded-md border border-[var(--vf-border-1)] bg-[var(--vf-bg-1)] px-2 text-[11px] text-[var(--vf-fg)]"
        >
          {selector.opciones.some((o) => o.id === selector.actual) ? null : (
            <option value={selector.actual}>{selector.actual}</option>
          )}
          {selector.opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      ) : (
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
      )}

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

      {/* Editar sobre la vista existe SÓLO con el motor vivo: nunca en producción. */}
      <button
        type="button"
        onClick={() => onEditando(!editando)}
        disabled={fase !== "vivo"}
        aria-pressed={editando}
        title={
          fase === "vivo"
            ? "Resalta el elemento al pasar el mouse y lo selecciona al hacer clic"
            : "Enciende el motor vivo para editar sobre la vista"
        }
        className={cn(
          "h-7 rounded-md border px-2.5 text-[11px] font-medium transition",
          editando
            ? "border-[#6d28d9] bg-[#6d28d9] text-white"
            : "border-[var(--vf-border-1)] text-[var(--vf-fg-1)] hover:border-[var(--vf-fg)]",
          fase !== "vivo" && "cursor-not-allowed opacity-30",
        )}
      >
        {editando ? "Editando" : "Editar vista"}
      </button>

      <button
        type="button"
        onClick={() => onVerControl(!verControl)}
        disabled={fase !== "vivo"}
        aria-pressed={verControl}
        title="Historial, deshacer, comparar y publicar"
        className={cn(
          "h-7 rounded-md border px-2.5 text-[11px] font-medium transition",
          verControl
            ? "border-[var(--vf-fg)] bg-[var(--vf-fg)] text-[var(--vf-bg-1)]"
            : "border-[var(--vf-border-1)] text-[var(--vf-fg-1)] hover:border-[var(--vf-fg)]",
          fase !== "vivo" && "cursor-not-allowed opacity-30",
        )}
      >
        Control
      </button>

      <p className="min-w-0 flex-1 truncate text-[11px] leading-4 text-[var(--vf-fg-2)]">
        {fase === "error" && error ? (
          <span className="text-[var(--vf-fg-1)]">{error}</span>
        ) : fase === "vivo" && editando ? (
          <>
            Pasa el mouse y haz clic en lo que quieras cambiar
            {typeof marcados === "number" ? ` · ${marcados} elementos ubicados en el código` : ""}
          </>
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
