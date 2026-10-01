"use client";

import type { ReactNode } from "react";
import { IconSearch, IconX } from "@/components/brand/VFIcons";
import { cn } from "@/lib/utils";

/**
 * Barra de filtros de VForge: un solo patrón para todas las pantallas que filtran.
 *
 * - Pastillas legibles (13 px, 44 px de alto en celular) con estado activo en negro.
 * - Conteo por opción cuando la pantalla lo da (`n`).
 * - En celular cada fila se desliza de lado sin empujar la página; en escritorio se acomoda en renglones.
 * - Sin naranja: el acento queda reservado para la acción principal de la página.
 */

export type OpcionFiltro<T extends string = string> = {
  id: T;
  label: string;
  /** Cuántos resultados quedarían al elegir esta opción. Se omite si no hay dato. */
  n?: number;
};

const ETIQUETA = "font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]";

/* ───────────────────────── pastilla ───────────────────────── */

export function Pastilla({
  activo,
  label,
  n,
  onClick,
}: {
  activo: boolean;
  label: string;
  n?: number;
  onClick: () => void;
}) {
  const vacia = n === 0 && !activo;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors md:min-h-9",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
        activo
          ? "border-black bg-black text-white"
          : "border-[var(--border-1)] bg-white text-black hover:border-black",
        vacia && "text-[var(--fg-muted)]",
      )}
    >
      {activo ? (
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
      ) : null}
      {label}
      {n !== undefined ? (
        <span
          className={cn(
            "min-w-[1.25rem] rounded-full px-1.5 text-center text-[12px] tabular-nums",
            activo ? "bg-white/15 text-white" : "bg-[var(--surface-1)] text-[var(--fg-secondary)]",
          )}
        >
          {n}
        </span>
      ) : null}
    </button>
  );
}

/* ───────────────────────── grupo ───────────────────────── */

type GrupoBase<T extends string> = {
  /** Título visible del grupo (también nombra el grupo para lectores de pantalla). */
  etiqueta: string;
  /** Oculta el título visible; sigue anunciándose. */
  ocultarEtiqueta?: boolean;
  opciones: OpcionFiltro<T>[];
  className?: string;
};

type GrupoUno<T extends string> = GrupoBase<T> & {
  multiple?: false;
  valor: T;
  onCambio: (v: T) => void;
};

type GrupoVarios<T extends string> = GrupoBase<T> & {
  multiple: true;
  valor: T[];
  onCambio: (v: T[]) => void;
  /** Pastilla inicial "Todos": prendida cuando no hay nada elegido; tocarla apaga todo. */
  todos?: { label: string; n?: number };
};

/**
 * Fila de pastillas. Con `multiple` cada pastilla se prende y apaga sola; sin él, se elige una.
 */
export function GrupoFiltros<T extends string>(props: GrupoUno<T> | GrupoVarios<T>) {
  const { etiqueta, ocultarEtiqueta, opciones, className } = props;
  const activo = (id: T) => (props.multiple ? props.valor.includes(id) : props.valor === id);
  const tocar = (id: T) => {
    if (props.multiple) {
      const v = props.valor;
      props.onCambio(v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
    } else {
      props.onCambio(id);
    }
  };

  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn(ETIQUETA, "mb-1.5", ocultarEtiqueta && "sr-only")}>{etiqueta}</p>
      <div
        role="group"
        aria-label={etiqueta}
        // El padding deja espacio al anillo de foco dentro de la caja que se desliza.
        className="no-scrollbar -m-1 flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain p-1 md:flex-wrap md:overflow-visible"
      >
        {props.multiple && props.todos ? (
          <Pastilla
            activo={props.valor.length === 0}
            label={props.todos.label}
            n={props.todos.n}
            onClick={() => props.onCambio([])}
          />
        ) : null}
        {opciones.map((o) => (
          <Pastilla key={o.id} activo={activo(o.id)} label={o.label} n={o.n} onClick={() => tocar(o.id)} />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── búsqueda ───────────────────────── */

export function BusquedaFiltro({
  valor,
  onCambio,
  placeholder,
  etiqueta = "Buscar",
  className,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
  etiqueta?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--border-1)] bg-white px-3 transition-colors",
        "focus-within:border-black",
        className,
      )}
    >
      <IconSearch size={15} className="shrink-0 text-[var(--fg-secondary)]" />
      <span className="sr-only">{etiqueta}</span>
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-[14px] text-black outline-none placeholder:text-[var(--fg-muted)] [&::-webkit-search-cancel-button]:hidden"
      />
      {valor ? (
        <button
          type="button"
          onClick={() => onCambio("")}
          aria-label="Borrar búsqueda"
          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-black"
        >
          <IconX size={14} />
        </button>
      ) : null}
    </label>
  );
}

/* ───────────────────────── barra ───────────────────────── */

/**
 * Contenedor: búsqueda (opcional) + grupos + pie con el resumen y "Limpiar filtros".
 * `resumen` se anuncia en vivo para que quien usa lector sepa cuántos quedan.
 */
export function BarraFiltros({
  busqueda,
  acciones,
  children,
  resumen,
  activos = 0,
  onLimpiar,
  className,
}: {
  busqueda?: {
    valor: string;
    onCambio: (v: string) => void;
    placeholder: string;
    etiqueta?: string;
  };
  /** Controles junto a la búsqueda (p. ej. ordenar). */
  acciones?: ReactNode;
  children?: ReactNode;
  resumen?: ReactNode;
  /** Cuántos filtros hay puestos: muestra "Limpiar filtros" si es mayor a cero. */
  activos?: number;
  onLimpiar?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {busqueda || acciones ? (
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
          {busqueda ? (
            <BusquedaFiltro
              valor={busqueda.valor}
              onCambio={busqueda.onCambio}
              placeholder={busqueda.placeholder}
              etiqueta={busqueda.etiqueta}
              className="flex-1"
            />
          ) : null}
          {acciones ? <div className="flex min-w-0 flex-wrap gap-2">{acciones}</div> : null}
        </div>
      ) : null}

      {children}

      {resumen !== undefined || (activos > 0 && onLimpiar) ? (
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {resumen !== undefined ? (
            <p className="text-[13px] tabular-nums text-[var(--fg-secondary)]" aria-live="polite">
              {resumen}
            </p>
          ) : (
            <span />
          )}
          {activos > 0 && onLimpiar ? (
            <button
              type="button"
              onClick={onLimpiar}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-black underline underline-offset-4 md:min-h-8"
            >
              <IconX size={12} />
              Limpiar filtros{activos > 1 ? ` (${activos})` : ""}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
