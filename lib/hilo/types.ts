export type HiloLinea = "personal" | "negocio";
export type HiloLineaAnalisis = HiloLinea | "zip";
export type HiloEstadoLinea = "conectado" | "esperando_qr" | "reconectando";
export type HiloTipoHallazgo = "pendiente" | "oportunidad" | "riesgo";

export interface HiloLineaEstado {
  linea: HiloLinea;
  conectado: boolean;
  estado: HiloEstadoLinea;
  hook: string;
  degradado: boolean;
  motivo_degradado: string | null;
  ultimo_mensaje: {
    chat_id: string;
    chat_nombre: string | null;
    tipo: string;
    texto: string | null;
    ts: string;
    id_wa: string;
  } | null;
  ultimo_error: string | null;
  qr_disponible: boolean;
  updated_at: string;
}

export interface HiloMensaje {
  uid: string;
  linea: HiloLinea | null;
  chat_id: string;
  chat_nombre: string | null;
  es_grupo: boolean;
  autor: string | null;
  de_mi: boolean;
  tipo: string;
  texto: string | null;
  ts: string;
  id_wa: string;
  media_tipo: string | null;
  origen: "vivo" | "zip";
  hilo_chat_id: string | null;
}

export interface HiloHallazgo {
  id: string;
  linea: HiloLineaAnalisis;
  chat_id: string;
  chat_nombre: string | null;
  chat_clase: "personal" | "negocio";
  tipo: HiloTipoHallazgo;
  titulo: string;
  detalle: string | null;
  prioridad: "baja" | "media" | "alta" | "critica";
  project_id: string | null;
  project_name: string | null;
  importante: boolean;
  created_at: string;
}

export interface HiloProject {
  id: string;
  name: string;
}

export interface HiloChat {
  id: string;
  linea: HiloLinea | null;
  chat_id: string | null;
  chat_nombre: string;
  etiqueta: string | null;
  project_id: string;
  project_name: string | null;
  monitorear: boolean;
  origen: "zip" | "vivo";
  creado_en: string;
  mensajes_count: number;
  ultimo_ts: string | null;
  ultimo_texto: string | null;
}

export interface HiloDashboardData {
  service: {
    configured: boolean;
    ok: boolean;
    error: string | null;
    active: boolean;
    lineas: Record<HiloLinea, HiloLineaEstado> | null;
    ts: string | null;
  };
  db: {
    configured: boolean;
    ok: boolean;
    error: string | null;
  };
  mensajes: HiloMensaje[];
  hallazgos: HiloHallazgo[];
  chats: HiloChat[];
  projects: HiloProject[];
}
