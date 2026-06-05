/**
 * Helper para hablar con el servidor Flask de V en Hetzner.
 *
 * El servidor expone endpoints de "manos" que V usa para ejecutar código
 * real, controlar navegadores y generar imágenes. Vive en la IP fija del
 * Hetzner (configurable via env var V_SERVER_URL).
 *
 *   /execute         → corre código Python/Node, devuelve stdout/stderr
 *   /browser         → Playwright (goto, click, type, evaluate, screenshot)
 *   /generate-image  → generación vía OpenRouter / Gemini / FLUX
 *   /ssh-execute     → SSH a server remoto vía paramiko
 *
 * Todos los endpoints están implementados en docs/v-server/api.py. Si
 * uno devuelve 404, el server en Hetzner no está actualizado — hay que
 * redesplegar api.py. Devolvemos error claro para que V lo reporte a
 * Luis sin pretender que jaló.
 */

const DEFAULT_URL = "http://178.105.135.26/v-server";
const DEFAULT_TIMEOUT_MS = 35_000;

export interface VServerResponse {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
}

export async function callVServer(
  path: string,
  body: Record<string, unknown>,
  opts: { timeoutMs?: number } = {},
): Promise<VServerResponse> {
  const base = process.env.V_SERVER_URL || DEFAULT_URL;
  const url = `${base.replace(/\/$/, "")}${path}`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Si V_SERVER_TOKEN está definido en este lado, mandarlo como header
  // X-V-Token. El Flask del Hetzner valida ese header cuando su propia
  // env var V_SERVER_TOKEN está activa — sin esto, las requests darían
  // 401 una vez activado el auth en el servidor.
  const token = process.env.V_SERVER_TOKEN;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && token.length > 0) {
    headers["X-V-Token"] = token;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        body: parsed,
        error:
          res.status === 404
            ? `endpoint ${path} no existe aún en el servidor (falta implementar en api.py)`
            : `server respondió ${res.status}`,
      };
    }
    return { ok: true, status: res.status, body: parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      body: null,
      error: isAbort
        ? `timeout tras ${timeoutMs}ms — el servidor no respondió`
        : `no se pudo conectar al servidor (${message}). ¿Está vivo http://178.105.135.26:5000/health?`,
    };
  } finally {
    clearTimeout(timer);
  }
}
