export const PROJECT_ETAPAS = [
  "prospecto",
  "chat_cargado",
  "demo_en_construccion",
  "demo_entregada",
  "contrato_enviado",
  "firmado",
  "en_construccion",
  "entregado",
  "mantenimiento",
] as const;

export const PROJECT_ETAPA_LATERAL = "perdido" as const;

export const PROJECT_ETAPA_VALUES = [
  ...PROJECT_ETAPAS,
  PROJECT_ETAPA_LATERAL,
] as const;

export type ProjectEtapa = (typeof PROJECT_ETAPA_VALUES)[number];

export interface ProjectEtapaHistoryItem {
  id: string;
  project_id: string;
  etapa: ProjectEtapa;
  nota: string | null;
  creado_por: string | null;
  creado_en: string;
}

export const PROJECT_ETAPA_LABELS: Record<ProjectEtapa, string> = {
  prospecto: "Prospecto",
  chat_cargado: "Chat cargado",
  demo_en_construccion: "Demo en construcción",
  demo_entregada: "Demo entregada",
  contrato_enviado: "Contrato enviado",
  firmado: "Firmado",
  en_construccion: "En construcción",
  entregado: "Entregado",
  mantenimiento: "Mantenimiento",
  perdido: "Perdido",
};

export const PROJECT_ETAPA_DESCRIPTIONS: Record<ProjectEtapa, string> = {
  prospecto: "Cliente nuevo o relación por abrir.",
  chat_cargado: "Ya hay contexto real de WhatsApp.",
  demo_en_construccion: "Base o demo adaptándose para el cliente.",
  demo_entregada: "Demo enviada y lista para decisión.",
  contrato_enviado: "Contrato generado fuera de VForge y compartido.",
  firmado: "Contrato firmado; el proyecto puede arrancar formalmente.",
  en_construccion: "App real en ejecución.",
  entregado: "App entregada al cliente.",
  mantenimiento: "Proyecto vivo con soporte o mejoras puntuales.",
  perdido: "Salida lateral: relación caída o no viable.",
};

export function isProjectEtapa(value: unknown): value is ProjectEtapa {
  return (
    typeof value === "string" &&
    (PROJECT_ETAPA_VALUES as readonly string[]).includes(value)
  );
}

export function nextProjectEtapa(etapa: ProjectEtapa | null | undefined) {
  if (!etapa || etapa === PROJECT_ETAPA_LATERAL) return null;
  const index = PROJECT_ETAPAS.indexOf(etapa);
  return index >= 0 ? PROJECT_ETAPAS[index + 1] ?? null : null;
}

export function previousProjectEtapa(etapa: ProjectEtapa | null | undefined) {
  if (!etapa || etapa === PROJECT_ETAPA_LATERAL) return null;
  const index = PROJECT_ETAPAS.indexOf(etapa);
  return index > 0 ? PROJECT_ETAPAS[index - 1] ?? null : null;
}

export function etapaLabel(value: string | null | undefined) {
  return isProjectEtapa(value) ? PROJECT_ETAPA_LABELS[value] : "Sin etapa";
}
