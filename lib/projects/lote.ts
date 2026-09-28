/**
 * Validación del lote de edición masiva.
 *
 * Vive aparte del endpoint por dos razones: los archivos `route.ts` sólo pueden
 * exportar lo que Next espera, y así la validación se prueba sin base ni red
 * (`npm test`). Los limpiadores son los MISMOS que usa la edición de uno en uno:
 * un solo dueño de cada regla.
 */
import { VALID_PROJECT_CATEGORIES, cleanFamilyCode, cleanText } from "@/lib/projects/delivery-meta";

/** Tope por lote: la pantalla nunca manda más y evita un golpe accidental al catálogo entero. */
export const MAX_LOTE = 200;

/** Campos que se pueden cambiar en masa. El dinero se captura de uno en uno. */
export const CAMPOS_LOTE = ["category", "client_name", "family_code", "delivery_priority"] as const;

export interface CuerpoLote {
  ids?: unknown;
  patch?: {
    category?: unknown;
    client_name?: unknown;
    delivery_priority?: unknown;
    family_code?: unknown;
  };
}

export interface LoteValidado {
  ids: string[];
  sets: Array<{ col: string; valor: unknown }>;
  /** true cuando el lote fija el estado: eso cuenta como clasificar a mano. */
  manual: boolean;
}

export function validarLote(body: CuerpoLote | null): LoteValidado | { error: string } {
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.map((x) => String(x).trim()).filter(Boolean))]
    : [];
  if (!ids.length) return { error: "sin_proyectos" };
  if (ids.length > MAX_LOTE) return { error: "lote_demasiado_grande" };
  if (ids.some((id) => !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id))) return { error: "id_invalido" };

  const patch = body?.patch ?? {};
  const sets: Array<{ col: string; valor: unknown }> = [];
  let manual = false;

  if (patch.category !== undefined) {
    const cat = String(patch.category);
    if (!(VALID_PROJECT_CATEGORIES as readonly string[]).includes(cat)) {
      return { error: "categoria_invalida" };
    }
    sets.push({ col: "category", valor: cat });
    manual = true;
  }
  if (patch.client_name !== undefined) {
    // Cadena vacía = borrar el cliente del lote (acción explícita del usuario).
    sets.push({ col: "client_name", valor: cleanText(patch.client_name, 120) });
  }
  if (patch.family_code !== undefined) {
    sets.push({ col: "family_code", valor: cleanFamilyCode(patch.family_code) });
  }
  if (patch.delivery_priority !== undefined) {
    if (typeof patch.delivery_priority !== "boolean") return { error: "prioridad_invalida" };
    sets.push({ col: "delivery_priority", valor: patch.delivery_priority });
  }

  if (!sets.length) return { error: "nada_que_cambiar" };
  return { ids, sets, manual };
}
