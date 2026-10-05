"use client";

/**
 * Fila de familia: una app, un renglón.
 *
 * El catálogo trae la misma app partida en muchos proyectos (medido 28-sep:
 * `vliving` aparece 14 veces). Esta fila resume la familia —cuántos son, en qué
 * estado están, cuándo se movió por última vez y cuánto falta por cobrar— y se
 * abre para ver los proyectos de adentro.
 */
import { IconChevD, IconLayers } from "@/components/brand/VFIcons";
import type { Familia } from "@/lib/projects/familias";
import {
  ETIQUETA_CATEGORIA,
  MXN,
  hace,
  porCobrar,
  type ProyectoVista,
} from "@/lib/projects/vista";

export function FamilyRow({
  familia,
  total,
  abierta,
  seleccionada,
  now,
  onAbrir,
  onSeleccionar,
  children,
}: {
  familia: Familia<ProyectoVista>;
  /** Cuántos miembros tiene la familia en el catálogo completo (sin filtrar). */
  total: number;
  abierta: boolean;
  /** true = todos los miembros visibles están seleccionados. */
  seleccionada: boolean;
  now: number;
  onAbrir: () => void;
  onSeleccionar: (valor: boolean) => void;
  children: React.ReactNode;
}) {
  const miembros = familia.miembros;
  const estados = new Map<string, number>();
  let cobrar = 0;
  let movimiento: number | null = null;
  for (const m of miembros) {
    estados.set(m.estado_real, (estados.get(m.estado_real) ?? 0) + 1);
    cobrar += porCobrar(m);
    const t = m.last_push ? new Date(m.last_push).getTime() : null;
    if (t !== null && (movimiento === null || t > movimiento)) movimiento = t;
  }
  const resumenEstados = [...estados.entries()]
    .map(([id, n]) => `${n} ${(ETIQUETA_CATEGORIA[id] ?? id).toLowerCase()}`)
    .join(" · ");
  const oculta = total - miembros.length;

  return (
    <article className={abierta ? "bg-[#f7f7f5]" : undefined}>
      <div className="flex flex-wrap items-center gap-3 px-page-sm md:px-page-md py-4 transition hover:bg-[#fafaf8] xl:px-page-lg">
        <input
          type="checkbox"
          checked={seleccionada}
          onChange={(e) => onSeleccionar(e.target.checked)}
          aria-label={`Seleccionar los ${miembros.length} proyectos de ${familia.etiqueta}`}
          className="h-4 w-4 shrink-0 accent-black"
        />
        <button
          type="button"
          onClick={onAbrir}
          aria-expanded={abierta}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <IconLayers size={14} className="shrink-0" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-black">
                {familia.etiqueta}
              </span>
              <span className="rounded-full border border-black px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.1em]">
                {miembros.length} proyecto{miembros.length === 1 ? "" : "s"}
              </span>
              {oculta > 0 ? (
                <span className="font-mono text-[12px] text-[var(--fg-muted)]">
                  +{oculta} fuera del filtro
                </span>
              ) : null}
            </span>
            <span className="mt-1 block truncate text-[12px] text-[var(--fg-tertiary)]">
              {familia.motivo}
              {resumenEstados ? ` · ${resumenEstados}` : ""}
              {movimiento !== null ? ` · movida ${hace(new Date(movimiento).toISOString(), now)}` : " · sin push"}
              {cobrar > 0 ? ` · por cobrar ${MXN.format(cobrar)}` : ""}
            </span>
          </span>
        </button>
        <button type="button" onClick={onAbrir} className="btn-ghost !min-h-9 !px-3">
          {abierta ? "Cerrar" : `Ver los ${miembros.length}`}
          <IconChevD size={12} className={abierta ? "rotate-180 transition" : "transition"} />
        </button>
      </div>
      {abierta ? (
        <div className="border-t border-[var(--border-1)] bg-white pl-3 md:pl-6">{children}</div>
      ) : null}
    </article>
  );
}
