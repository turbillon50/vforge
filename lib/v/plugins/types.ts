/**
 * Sistema de plugins de V — contratos compartidos.
 *
 * Un plugin es una capacidad que V gana SIN tocar el código del chat: se
 * registra en la tabla `v_plugins` (Neon) con un `trigger_pattern` (regex) y un
 * `endpoint`. Cuando el mensaje del usuario hace match con el patrón, V ejecuta
 * el plugin y mezcla su respuesta en el reply.
 *
 * Hay dos clases de plugin:
 *   - nativos:  endpoint = "internal:<slug>" → se ejecutan en proceso vía el
 *               handler de lib/v/plugins/handlers.ts (rápido, sin self-HTTP).
 *   - externos: endpoint = URL http(s) → se llaman por fetch con el contexto.
 */

export interface PluginRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Regex (texto) que activa el plugin, p.ej. "genera imagen|visualiza". */
  trigger_pattern: string;
  /** "internal:<slug>" para nativos, o URL http(s) para externos. */
  endpoint: string;
  active: boolean;
  version: string;
  /** "native" | "installed" | "external". */
  source: string;
  /** Config arbitraria (defaults, keys de env a usar, etc.). */
  config: Record<string, unknown>;
}

/** Contexto que recibe un plugin al ejecutarse. */
export interface PluginContext {
  /** Mensaje original del usuario. */
  message: string;
  /** Resultado del regex match (grupos capturados disponibles). */
  match: RegExpMatchArray | null;
  userId?: string;
  sessionId?: string;
  /** Args opcionales si V o el cliente los pasa explícitos. */
  args?: Record<string, unknown>;
}

/** Lo que devuelve un plugin tras ejecutarse. */
export interface PluginResult {
  ok: boolean;
  /** Texto listo para mostrar dentro del reply de V. */
  reply: string;
  /** Payload estructurado (URL de imagen, deployment, etc.). */
  data?: unknown;
  error?: string;
}

export type PluginHandler = (ctx: PluginContext) => Promise<PluginResult>;
