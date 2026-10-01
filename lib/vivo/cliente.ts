"server-only";

/**
 * Cliente del motor vivo (vf-vivo en el Hetzner).
 *
 * El Estudio ya no apunta el iframe al deploy de Vercel: le pide a este servicio
 * un servidor de desarrollo encendido y recibe una URL con token. El secreto
 * nunca sale del servidor — todo pasa por rutas /api/vivo/* con gate de owner.
 */

const BASE_POR_DEFECTO = "https://vivo1.178.105.135.26.sslip.io";
const TIEMPO_LIMITE_MS = 120_000; // arrancar un dev server frío puede tardar

export type SlotVivo = {
  id: string;
  host: string;
  puerto: number;
  proyecto: string | null;
  vivo: boolean;
  listo: boolean;
  arrancado: number | null;
  ociosoSeg: number | null;
};

export type PreparacionVivo = {
  fase: "clonando" | "rama" | "instalando" | "capa" | "registro" | "listo" | "error";
  error: string | null;
  inicio: number;
  fin: number | null;
};

export type EstadoVivo = {
  maxSlots: number;
  ocioMin: number;
  memMb: number;
  proyectos: string[];
  preparando?: Record<string, PreparacionVivo>;
  slots: SlotVivo[];
};

export type ArranqueVivo = {
  slot: string;
  url: string;
  entrada: string;
  reutilizado: boolean;
};

export type ArchivoVivo = { path: string; content: string };

export type OperacionVivo =
  | { tipo: "texto"; valor: string }
  | { tipo: "estilo"; props: Record<string, string | number> }
  | { tipo: "clase"; valor: string };

export type ResultadoEdicion = {
  ok: true;
  archivo: string;
  linea?: number;
  sinCambio?: boolean;
};

export type AgenteVivo = "claude" | "codex";

function base(): string {
  const bruto = (process.env.VIVO_API_BASE ?? BASE_POR_DEFECTO).trim();
  const url = new URL(bruto);
  if (url.protocol !== "https:") {
    throw new Error("VIVO_API_BASE tiene que ser HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

function secreto(): string {
  const valor = process.env.VF_VIVO_SECRET?.trim();
  if (!valor) {
    throw new Error("Falta VF_VIVO_SECRET: el motor vivo no está conectado.");
  }
  return valor;
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  try {
    const respuesta = await fetch(`${base()}/__vivo/api/${ruta}`, {
      ...init,
      cache: "no-store",
      signal: control.signal,
      headers: {
        "content-type": "application/json",
        "x-vivo-key": secreto(),
        ...(init?.headers ?? {}),
      },
    });
    const texto = await respuesta.text();
    let datos: unknown = null;
    try {
      datos = texto ? JSON.parse(texto) : null;
    } catch {
      throw new Error(`El motor vivo respondió algo que no es JSON (HTTP ${respuesta.status}).`);
    }
    if (!respuesta.ok) {
      const detalle =
        datos && typeof datos === "object" && "error" in datos
          ? String((datos as { error: unknown }).error)
          : `HTTP ${respuesta.status}`;
      throw new Error(detalle);
    }
    return datos as T;
  } finally {
    clearTimeout(reloj);
  }
}

/** Stream de un agente real encerrado en el worktree vivo. */
export function agenteVivo(
  proyecto: string,
  agente: AgenteVivo,
  mensaje: string,
  sesion?: string | null,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${base()}/__vivo/api/agente`, {
    method: "POST",
    cache: "no-store",
    signal,
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-vivo-key": secreto(),
    },
    body: JSON.stringify({ project: proyecto, agente, mensaje, sesion: sesion || undefined }),
  });
}

/** Enciende (o reutiliza) el dev server del proyecto y devuelve la URL con token. */
export function arrancarVivo(proyecto: string): Promise<ArranqueVivo> {
  return pedir<ArranqueVivo>("start", {
    method: "POST",
    body: JSON.stringify({ project: proyecto }),
  });
}

/** Apaga el dev server del proyecto (el motor también lo apaga solo por ocio). */
export function detenerVivo(proyecto: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>("stop", {
    method: "POST",
    body: JSON.stringify({ project: proyecto }),
  });
}

/** Qué hay encendido ahora mismo. */
export function estadoVivo(): Promise<EstadoVivo> {
  return pedir<EstadoVivo>("status");
}

export type CommitVivo = {
  sha: string;
  asunto: string;
  fecha: string;
  autor: string;
  delEstudio: boolean;
};

export type AccionGit = "estado" | "historial" | "comparar" | "commit" | "deshacer" | "publicar";

/**
 * Control del preview vivo: historial, deshacer, comparar y publicar.
 * `publicar` es el único que toca la rama de producción.
 */
export function gitVivo(
  proyecto: string,
  accion: AccionGit,
  extra: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  return pedir<Record<string, unknown>>("git", {
    method: "POST",
    body: JSON.stringify({ project: proyecto, accion, ...extra }),
  });
}

/** Traduce una edición hecha sobre la vista previa a un cambio en el código. */
export function editarVivo(
  proyecto: string,
  src: string,
  operacion: OperacionVivo,
): Promise<ResultadoEdicion> {
  return pedir<ResultadoEdicion>("edit", {
    method: "POST",
    body: JSON.stringify({ project: proyecto, src, operacion }),
  });
}

/** Escribe archivos reales en el worktree: es lo que hace que el cambio se vea. */
export function escribirVivo(
  proyecto: string,
  archivos: ArchivoVivo[],
): Promise<{ ok: true; escritos: string[] }> {
  return pedir<{ ok: true; escritos: string[] }>("write", {
    method: "POST",
    body: JSON.stringify({ project: proyecto, files: archivos }),
  });
}

/**
 * Encargo de V: V redacta el encargo con el elemento señalado (siempre pide
 * revisar) y lo mete a la cola; un agente lo hace ENCERRADO en el worktree vivo.
 */
export function encargarVivo(
  proyecto: string,
  pedido: string,
  elemento: { src: string; etiqueta: string; texto: string },
): Promise<{ ok: true; encargo: number; dispatch: number }> {
  return pedir("encargo", {
    method: "POST",
    body: JSON.stringify({ project: proyecto, pedido, elemento, agente: "claude" }),
  });
}

/** Últimos encargos del proyecto con su estado y lo que V aprendió de cada uno. */
export function listarEncargos(
  proyecto: string,
  limite = 8,
): Promise<{ ok: true; encargos: import("@/components/studio/vivo/encargos-tipos").EncargoV[] }> {
  return pedir("encargos", {
    method: "POST",
    body: JSON.stringify({ project: proyecto, limite }),
  });
}

/**
 * Registra un proyecto en el motor vivo: el Hetzner clona el repo, instala y deja
 * la capa de edición lista. Es asíncrono: el avance se lee en `estadoVivo().preparando`.
 */
export function registrarVivo(
  proyecto: string,
  repo: string,
  rama?: string | null,
): Promise<{ ok: true; project: string; fase: string; error: string | null }> {
  return pedir("register", {
    method: "POST",
    body: JSON.stringify({ project: proyecto, repo, branch: rama ?? undefined }),
  });
}
