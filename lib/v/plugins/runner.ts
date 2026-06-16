/**
 * Plugin Runner — ejecuta un plugin que hizo match.
 *
 *   - endpoint "internal:<slug>" → despacha al handler nativo en proceso.
 *   - endpoint http(s)://…       → POST con el contexto, espera { reply|text, data }.
 *
 * Todo es best-effort y con timeout: un plugin que truena devuelve un
 * PluginResult ok:false con mensaje claro, jamás lanza hacia el chat.
 */
import { NATIVE_HANDLERS } from "./handlers";
import type { PluginContext, PluginResult, PluginRow } from "./types";
import type { PluginMatch } from "./registry";

const EXTERNAL_TIMEOUT_MS = 60_000;

export async function runPlugin(plugin: PluginRow, ctx: PluginContext): Promise<PluginResult> {
  // Nativo en proceso.
  if (plugin.endpoint.startsWith("internal:")) {
    const slug = plugin.endpoint.slice("internal:".length) || plugin.slug;
    const handler = NATIVE_HANDLERS[slug];
    if (!handler) {
      return { ok: false, error: "no_handler", reply: `Plugin "${plugin.name}" sin handler nativo (${slug}).` };
    }
    try {
      return await handler(ctx);
    } catch (e) {
      return { ok: false, error: errMsg(e), reply: `Plugin "${plugin.name}" falló: ${errMsg(e)}` };
    }
  }

  // Externo por HTTP.
  try {
    const res = await fetch(plugin.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(plugin.config?.authHeader && plugin.config?.authToken
          ? { [String(plugin.config.authHeader)]: String(plugin.config.authToken) }
          : {}),
      },
      body: JSON.stringify({
        message: ctx.message,
        match: ctx.match ? Array.from(ctx.match) : null,
        groups: ctx.match?.groups ?? null,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        args: ctx.args ?? {},
      }),
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}`, reply: `Plugin "${plugin.name}" respondió ${res.status}.` };
    }
    const data = (await res.json()) as { reply?: string; text?: string; data?: unknown; ok?: boolean };
    const reply = data.reply ?? data.text ?? "";
    return { ok: data.ok ?? true, reply: reply || `Plugin "${plugin.name}" ejecutado.`, data: data.data };
  } catch (e) {
    return { ok: false, error: errMsg(e), reply: `No pude ejecutar el plugin "${plugin.name}": ${errMsg(e)}` };
  }
}

/**
 * Ejecuta TODOS los plugins que hicieron match y devuelve sus resultados.
 * Corre en paralelo; el orden de entrada se preserva.
 */
export async function runMatchedPlugins(
  matches: PluginMatch[],
  base: Omit<PluginContext, "match">,
): Promise<Array<{ plugin: PluginRow; result: PluginResult }>> {
  const settled = await Promise.all(
    matches.map(async ({ plugin, match }) => ({
      plugin,
      result: await runPlugin(plugin, { ...base, match }),
    })),
  );
  return settled;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
