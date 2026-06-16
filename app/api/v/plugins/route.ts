/**
 * Registro y gestión de plugins de V.
 *
 *   GET  /api/v/plugins                → lista todos los plugins (owner).
 *   POST /api/v/plugins                → acciones (owner):
 *     { action: "install", query }     → busca en el catálogo global e instala.
 *     { action: "register", def }      → registra un plugin externo a la medida.
 *     { action: "toggle", slug, active } → activa/desactiva.
 *     { action: "run", slug, message } → ejecuta un plugin a mano (pruebas).
 *
 * Instalar un plugin = "V, instala el plugin de facturación CFDI": V busca en el
 * catálogo global, lo registra en v_plugins y lo activa.
 */
import { resolveAccess } from "@/lib/connect/resolve-token";
import { ensureDatabaseHealed } from "@/lib/db/client";
import {
  listAllPlugins,
  registerPlugin,
  setPluginActive,
  loadActivePlugins,
} from "@/lib/v/plugins/registry";
import { runPlugin } from "@/lib/v/plugins/runner";
import { findInstallable, type PluginDef } from "@/lib/v/plugins/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const access = await resolveAccess();
  if (!access.isOwner) return json({ error: "unauthorized" }, 401);
  await ensureDatabaseHealed();
  const plugins = await listAllPlugins();
  return json({ plugins });
}

export async function POST(req: Request) {
  const access = await resolveAccess();
  if (!access.isOwner) return json({ error: "unauthorized" }, 401);
  await ensureDatabaseHealed();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const action = String(body.action ?? "");

  switch (action) {
    case "install": {
      const query = String(body.query ?? body.name ?? "").trim();
      if (!query) return json({ error: "query_required" }, 400);
      const def = findInstallable(query);
      if (!def) {
        return json({ error: "not_found", message: `No hay un plugin "${query}" en el catálogo global.` }, 404);
      }
      const row = await registerPlugin(def, true);
      const needsEnv = (def.config?.needsEnv as string[] | undefined) ?? [];
      const missing = needsEnv.filter((k) => !process.env[k]);
      return json({
        ok: true,
        installed: row,
        warning: missing.length ? `Faltan env vars para operar: ${missing.join(", ")}` : undefined,
      });
    }

    case "register": {
      const def = body.def as PluginDef | undefined;
      if (!def?.slug || !def?.trigger_pattern || !def?.endpoint || !def?.name) {
        return json({ error: "def_incomplete", required: ["slug", "name", "trigger_pattern", "endpoint"] }, 400);
      }
      // Validar que el regex compila antes de guardarlo.
      try {
        new RegExp(def.trigger_pattern, "i");
      } catch {
        return json({ error: "bad_regex" }, 400);
      }
      const row = await registerPlugin(
        { ...def, version: def.version ?? "1.0.0", source: def.source ?? "external" },
        true,
      );
      return json({ ok: true, registered: row });
    }

    case "toggle": {
      const slug = String(body.slug ?? "");
      const active = Boolean(body.active);
      if (!slug) return json({ error: "slug_required" }, 400);
      const found = await setPluginActive(slug, active);
      if (!found) return json({ error: "not_found" }, 404);
      return json({ ok: true, slug, active });
    }

    case "run": {
      const slug = String(body.slug ?? "");
      const message = String(body.message ?? "");
      if (!slug || !message) return json({ error: "slug_and_message_required" }, 400);
      const plugins = await loadActivePlugins();
      const plugin = plugins.find((p) => p.slug === slug);
      if (!plugin) return json({ error: "not_found_or_inactive" }, 404);
      let match: RegExpMatchArray | null = null;
      try {
        match = message.match(new RegExp(plugin.trigger_pattern, "i"));
      } catch {
        /* regex inválido → match null, el handler usa el mensaje completo */
      }
      const result = await runPlugin(plugin, {
        message,
        match,
        userId: access.userId ?? undefined,
        args: (body.args as Record<string, unknown>) ?? {},
      });
      return json({ ok: result.ok, result });
    }

    default:
      return json({ error: "unknown_action", actions: ["install", "register", "toggle", "run"] }, 400);
  }
}
