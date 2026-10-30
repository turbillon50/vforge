import { providerRequest } from "@/lib/v-canonical/provider";
import { requireVOwner } from "@/lib/v-chat/auth";
import {
  loadConfig,
  saveConfig,
  publicConfig,
  mergeConfig,
} from "@/lib/v-canonical/config";
import { createMcpToken } from "@/lib/mcp/tokens";
import { testConnection } from "@/lib/v-canonical/tools";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
export async function GET(req: Request) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  try {
    return Response.json(publicConfig(await loadConfig()), { headers });
  } catch {
    return Response.json(
      { error: "No se pudo abrir la configuración de V." },
      { status: 503, headers },
    );
  }
}
export async function POST(req: Request) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return Response.json(
      { error: "Origen inválido." },
      { status: 403, headers },
    );
  try {
    const body = await req.json();
    const old = await loadConfig();
    if (body.action === "test-engine") {
      const response = await providerRequest(old, {
        messages: [
          { role: "user", content: "Responde solamente: conexión confirmada." },
        ],
        max_tokens: 300,
      });
      const data = await response.json();
      if (!response.ok || !data.choices?.[0]?.message?.content)
        return Response.json(
          {
            error:
              "El motor no confirmó respuesta. Revisa proveedor, modelo y credencial.",
          },
          { status: 502, headers },
        );
      return Response.json(
        { ok: true, model: data.model || old.model, engine: old.engine },
        { headers },
      );
    }
    if (body.action === "test") {
      const c = old.connections.find((c) => c.id === body.id);
      if (!c)
        return Response.json(
          { error: "Conexión no encontrada." },
          { status: 404, headers },
        );
      try {
        c.detail = await testConnection(c);
        c.status = "ready";
      } catch {
        c.status = "error";
        c.detail =
          "No se pudo confirmar el acceso. Revisa dirección, permisos y credencial.";
      }
      c.checkedAt = new Date().toISOString();
      await saveConfig(old);
      return Response.json(publicConfig(old), { headers });
    }
    const config = mergeConfig(body, old);
    const native = config.connections.find(
      (c) =>
        c.id === "vforge" &&
        c.kind === "mcp" &&
        c.endpoint === "https://vforge.site/api/mcp",
    );
    if (native && !native.secret && access.userId !== "operator_luis")
      native.secret = await createMcpToken(access.userId, "V canónica");
    await saveConfig(config);
    return Response.json(publicConfig(config), { headers });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error &&
          /inválid|Selecciona|Revisa|Usa |admite|demasiado|HTTPS|Nombre|Identificador/.test(
            e.message,
          )
            ? e.message
            : "No se pudo guardar. Verifica la configuración del servidor.",
      },
      { status: 400, headers },
    );
  }
}
