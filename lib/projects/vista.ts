/**
 * Tipos y etiquetas que comparten la pantalla de proyectos y sus piezas.
 *
 * Vive fuera de la página (que es un componente de cliente) para que las piezas
 * nuevas —panel de sugerencias, barra de lote, fila de familia— lean el MISMO
 * proyecto y las MISMAS etiquetas, sin copiar tipos.
 */
import type { Categoria, FuenteEstado } from "@/lib/projects/estado-real";
import type { ProjectRepository } from "@/lib/projects/repository-groups";

export interface SugerenciaVista {
  id: string;
  campo: string;
  valor: string;
  fuente: string;
  detalle: string | null;
}

export interface ProyectoVista {
  id: string;
  name: string;
  /** Categoría guardada (la que se ve en el selector del detalle). */
  category: string;
  category_manual_at?: string | null;
  status: string;
  github_repo: string | null;
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  vercel_project_id?: string | null;
  domain?: string | null;
  delivery_priority?: boolean;
  progress_pct?: number;
  family_code?: string | null;
  repositories: ProjectRepository[];
  repository_count: number;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  client_name?: string | null;
  due_date?: string | null;
  contract_amount?: number | null;
  paid_amount?: number | null;
  last_push?: string | null;
  notes_count?: number;
  last_note?: { body: string; created_at: string } | null;
  deploys_ready?: number;
  health_status?: number | null;
  health_ok?: boolean | null;
  health_checked_at?: string | null;
  /** Estado que manda en pantalla y en los filtros (manual o calculado). */
  estado_real: Categoria;
  estado_fuente: FuenteEstado;
  estado_motivo: string;
  sondeo_pendiente?: boolean;
  sugerencias?: SugerenciaVista[];
}

export const CATEGORIAS_UI: { id: Categoria; label: string }[] = [
  { id: "produccion", label: "Producción" },
  { id: "activo", label: "Activo" },
  { id: "en_revision", label: "En revisión" },
  { id: "en_pausa", label: "En pausa" },
  { id: "archivo", label: "Archivado" },
  { id: "pendiente_borrado", label: "Por borrar" },
];

export const ETIQUETA_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIAS_UI.map((c) => [c.id, c.label]),
);

export const ETIQUETA_SUGERENCIA: Record<string, string> = {
  client_name: "Cliente",
  contract_amount: "Monto del contrato",
  paid_amount: "Cobrado",
  due_date: "Fecha de entrega",
};

export const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const TZ = "America/Cancun";

/** "hace 3 días" — una sola forma de decir el tiempo en toda la pantalla. */
export function hace(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  const h = Math.round(s / 3600);
  if (h < 48) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 60) return `hace ${d} días`;
  const m = Math.round(d / 30);
  if (m < 24) return `hace ${m} meses`;
  return `hace ${Math.round(m / 12)} años`;
}

/** Fecha corta en español; `—` cuando no hay dato. */
export function fecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

/** Lo que falta por cobrar: contrato menos cobrado, nunca negativo. */
export function porCobrar(p: Pick<ProyectoVista, "contract_amount" | "paid_amount">) {
  return Math.max(0, (p.contract_amount ?? 0) - (p.paid_amount ?? 0));
}

/** Valor de una sugerencia ya formateado para leerse (montos con moneda). */
export function valorSugerido(campo: string, valor: string): string {
  if (campo === "contract_amount" || campo === "paid_amount") {
    const n = Number(valor);
    return Number.isFinite(n) ? MXN.format(n) : valor;
  }
  return valor;
}
