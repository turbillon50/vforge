"use client";

/**
 * Barra de edición masiva. Aparece cuando hay proyectos seleccionados y cambia
 * estado, cliente, prioridad o familia de todos a la vez (antes era uno por uno,
 * con 339 proyectos en el catálogo).
 *
 * Reglas de la barra: nada se aplica sin decir a cuántos les va a pegar, el
 * botón dice el número, y al terminar se avisa cuántos cambiaron de verdad.
 */
import { useState } from "react";
import { IconCheck, IconX } from "@/components/brand/VFIcons";
import { CATEGORIAS_UI } from "@/lib/projects/vista";

export interface CambioLote {
  category?: string;
  client_name?: string | null;
  delivery_priority?: boolean;
  family_code?: string | null;
}

export function BulkBar({
  seleccionados,
  ocupado,
  familiaSugerida,
  onAplicar,
  onLimpiar,
}: {
  seleccionados: number;
  ocupado: boolean;
  /** Raíz de familia propuesta cuando la selección viene de una familia. */
  familiaSugerida?: string | null;
  onAplicar: (cambio: CambioLote) => void;
  onLimpiar: () => void;
}) {
  const [campo, setCampo] = useState<keyof CambioLote>("category");
  const [categoria, setCategoria] = useState<string>("activo");
  const [cliente, setCliente] = useState("");
  const [familia, setFamilia] = useState(familiaSugerida ?? "");
  const [prioridad, setPrioridad] = useState(true);

  if (seleccionados === 0) return null;

  const cambio = (): CambioLote | null => {
    if (campo === "category") return { category: categoria };
    if (campo === "client_name") return { client_name: cliente.trim() || null };
    if (campo === "family_code") return { family_code: familia.trim() || null };
    return { delivery_priority: prioridad };
  };

  const describe = () => {
    if (campo === "category")
      return CATEGORIAS_UI.find((c) => c.id === categoria)?.label ?? categoria;
    if (campo === "client_name") return cliente.trim() ? `cliente "${cliente.trim()}"` : "sin cliente";
    if (campo === "family_code") return familia.trim() ? `familia "${familia.trim()}"` : "sin familia";
    return prioridad ? "con prioridad" : "sin prioridad";
  };

  const campoCls =
    "min-h-10 rounded-md border border-[var(--border-1)] bg-white px-2.5 text-[13px] text-black";

  return (
    <div className="sticky bottom-0 z-20 border-t border-black bg-white px-page-sm md:px-page-md py-3 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <p className="text-[13px] font-medium text-black">
          {seleccionados} seleccionado{seleccionados === 1 ? "" : "s"}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="lote-campo">
            Qué cambiar
          </label>
          <select
            id="lote-campo"
            value={campo}
            onChange={(e) => setCampo(e.target.value as keyof CambioLote)}
            className={campoCls}
          >
            <option value="category">Estado</option>
            <option value="client_name">Cliente</option>
            <option value="delivery_priority">Prioridad</option>
            <option value="family_code">Código de familia</option>
          </select>

          {campo === "category" ? (
            <select
              aria-label="Estado para el lote"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={campoCls}
            >
              {CATEGORIAS_UI.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : null}

          {campo === "client_name" ? (
            <input
              aria-label="Cliente para el lote"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente (vacío = borrar)"
              className={`${campoCls} min-w-[220px]`}
            />
          ) : null}

          {campo === "family_code" ? (
            <input
              aria-label="Código de familia para el lote"
              value={familia}
              onChange={(e) => setFamilia(e.target.value)}
              placeholder="ej. vliving (vacío = quitar)"
              className={`${campoCls} min-w-[200px] font-mono`}
            />
          ) : null}

          {campo === "delivery_priority" ? (
            <select
              aria-label="Prioridad para el lote"
              value={prioridad ? "si" : "no"}
              onChange={(e) => setPrioridad(e.target.value === "si")}
              className={campoCls}
            >
              <option value="si">Con prioridad</option>
              <option value="no">Sin prioridad</option>
            </select>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <button
            type="button"
            onClick={() => {
              const c = cambio();
              if (c) onAplicar(c);
            }}
            disabled={ocupado}
            className="btn-primary !min-h-10 !px-4"
          >
            <IconCheck size={12} />
            {ocupado ? "Aplicando…" : `Poner ${describe()} a ${seleccionados}`}
          </button>
          <button type="button" onClick={onLimpiar} className="btn-ghost !min-h-10 !px-3">
            <IconX size={12} /> Limpiar selección
          </button>
        </div>
      </div>
    </div>
  );
}
