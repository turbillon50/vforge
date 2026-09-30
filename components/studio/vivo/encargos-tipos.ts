/** Un encargo de V tal como lo devuelve el motor vivo (tabla v_encargos + cola). */
export type EstadoEncargo =
  | "en_cola"
  | "trabajando"
  | "listo"
  | "sin_cambios"
  | "sin_revision"
  | "fallo";

export type EncargoV = {
  id: number;
  creado: string | null;
  cerrado: string | null;
  agente: string;
  pedido: string;
  elemento: { src?: string; etiqueta?: string; texto?: string } | null;
  estado: EstadoEncargo;
  progreso: number | null;
  rastro: string | null;
  hice: string | null;
  revision: string | null;
  mal: string | null;
  correccion: string | null;
  leccion: string | null;
  commit: string | null;
  archivos: string[] | null;
  error: string | null;
};

export const TEXTO_ESTADO: Record<EstadoEncargo, string> = {
  en_cola: "en cola",
  trabajando: "trabajando",
  listo: "listo y revisado",
  sin_cambios: "no cambió nada",
  sin_revision: "cambió sin revisar",
  fallo: "falló",
};

export function encargoAbierto(e: EncargoV): boolean {
  return e.estado === "en_cola" || e.estado === "trabajando";
}
