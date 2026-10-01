export interface HiloZipMessage {
  uid: string;
  linea: null;
  chat_id: string;
  chat_nombre: string;
  es_grupo: boolean;
  autor: string | null;
  de_mi: boolean;
  tipo: "texto" | "audio" | "imagen" | "documento" | "otro";
  texto: string;
  ts: string;
  id_wa: string;
  media_ref: string | null;
  media_tipo: string | null;
  origen: "zip";
  hilo_chat_id: string;
  raw: Record<string, unknown>;
}

export interface HiloZipImport {
  chat: {
    id: string;
    linea: null;
    chat_id: string;
    chat_nombre: string;
    origen: "zip";
  };
  participants: string[];
  range: {
    desde: string | null;
    hasta: string | null;
  };
  messages: HiloZipMessage[];
  textFile: {
    name: string;
    size: number;
  };
  attachments: Array<{
    nombre: string;
    tipo: string;
    media_tipo: string;
  }>;
  source: {
    filename: string | null;
    entries: number;
  };
}

export function importarZipWhatsApp(
  input: Uint8Array | Buffer,
  options?: {
    projectId?: string;
    chatNombre?: string;
    filename?: string;
  },
): Promise<HiloZipImport>;

export function parseWhatsAppChatText(
  text: string,
  options?: {
    projectId?: string;
    chatNombre?: string;
    textFileName?: string;
  },
): Omit<HiloZipImport, "textFile" | "attachments" | "source">;
