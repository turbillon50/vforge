/**
 * Handlers de los plugins NATIVOS de V (ejecución en proceso).
 *
 * Cada handler implementa una capacidad reutilizando la infra que YA existe en
 * el repo (WhatsApp/Baileys, Vercel API, Neon, etc.). El runner los despacha por
 * slug cuando un plugin nativo (endpoint "internal:<slug>") hace match.
 *
 * Regla de oro: best-effort. Un plugin que falla devuelve { ok:false } con un
 * mensaje claro — NUNCA tumba el chat.
 */
import { sendWhatsapp, notifyOwner } from "@/lib/whatsapp/notify";
import { triggerDeployment } from "@/lib/vercel/client";
import { queryAll, queryOne } from "@/lib/db/client";
import type { PluginHandler, PluginResult } from "./types";

/* ───────────────────────── plugin-higgsfield ───────────────────────── */
/* "genera imagen | visualiza | muéstrame" → genera imagen y devuelve URL.   */
const higgsfield: PluginHandler = async (ctx): Promise<PluginResult> => {
  const prompt = extractAfterTrigger(ctx.message, ctx.match) || ctx.message;
  const endpoint = process.env.HIGGSFIELD_URL;

  // Sin endpoint configurado: degradar honesto, no inventar una URL falsa.
  if (!endpoint) {
    return {
      ok: false,
      error: "no_higgsfield_url",
      reply:
        "🎨 El plugin de imágenes (Higgsfield) está registrado pero falta " +
        "`HIGGSFIELD_URL` en el entorno para generar. Configúralo y vuelvo a intentar.",
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HIGGSFIELD_SECRET
          ? { Authorization: `Bearer ${process.env.HIGGSFIELD_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      return { ok: false, error: `higgsfield_${res.status}`, reply: "🎨 Higgsfield no respondió bien. Reintenta en un momento." };
    }
    const data = (await res.json()) as { url?: string; image_url?: string };
    const url = data.url ?? data.image_url;
    if (!url) return { ok: false, error: "no_url", reply: "🎨 Higgsfield respondió sin URL de imagen." };
    return { ok: true, reply: `🎨 Listo, generé tu imagen:\n${url}`, data: { url, prompt } };
  } catch (e) {
    return { ok: false, error: errMsg(e), reply: "🎨 No pude conectar con Higgsfield." };
  }
};

/* ───────────────────────────── plugin-deploy ───────────────────────────── */
/* "deploya | publica | lanza <proyecto>" → git→Vercel deploy y devuelve URL.  */
interface ProjectDeployRow {
  id: string;
  name: string;
  github_repo: string | null;
  vercel_project_id: string | null;
  github_default_branch: string | null;
}

const deploy: PluginHandler = async (ctx): Promise<PluginResult> => {
  const target = (extractAfterTrigger(ctx.message, ctx.match) || "").trim();
  if (!target) {
    return { ok: false, error: "no_project", reply: "🚀 ¿Qué proyecto deployo? Dime el nombre." };
  }

  const proj = await queryOne<ProjectDeployRow>(
    `SELECT id, name, github_repo, vercel_project_id, github_default_branch
       FROM projects
      WHERE lower(name) = lower($1) OR id = $1
      LIMIT 1`,
    [target],
  ).catch(() => null);

  if (!proj) return { ok: false, error: "project_not_found", reply: `🚀 No encontré el proyecto "${target}".` };
  if (!proj.vercel_project_id || !proj.github_repo) {
    return {
      ok: false,
      error: "project_unlinked",
      reply: `🚀 "${proj.name}" no tiene Vercel/GitHub vinculado, no puedo deployar todavía.`,
    };
  }

  try {
    const dep = await triggerDeployment(
      {
        name: proj.name,
        projectId: proj.vercel_project_id,
        ghRepoFullName: proj.github_repo,
        branch: proj.github_default_branch ?? "main",
        target: "production",
      },
      { auditUserId: ctx.userId },
    );
    const url = dep.url?.startsWith("http") ? dep.url : `https://${dep.url}`;
    return {
      ok: true,
      reply: `🚀 Deploy de **${proj.name}** lanzado.\n${url}\nEstado: ${dep.readyState ?? "BUILDING"}`,
      data: dep,
    };
  } catch (e) {
    return { ok: false, error: errMsg(e), reply: `🚀 Falló el deploy de "${proj.name}": ${errMsg(e)}` };
  }
};

/* ──────────────────────────── plugin-whatsapp ──────────────────────────── */
/* "manda a | avisa | notifica" → envía WhatsApp a Luis o a un número.         */
const whatsapp: PluginHandler = async (ctx): Promise<PluginResult> => {
  const rest = extractAfterTrigger(ctx.message, ctx.match) || ctx.message;

  // ¿Trae un número? (10+ dígitos). Si no, va a Luis (dueño).
  const phoneMatch = rest.match(/(\+?\d[\d\s\-()]{8,}\d)/);
  const explicitTo = (ctx.args?.to as string) || phoneMatch?.[0];
  // El cuerpo del mensaje: lo que sigue tras ":" o tras "que/diciendo", o todo.
  const colon = rest.split(/:|que dice|diciendo|que/i);
  const text = (ctx.args?.text as string) || (colon.length > 1 ? colon.slice(1).join(" ") : rest).trim();

  if (!text) return { ok: false, error: "no_text", reply: "📲 ¿Qué mensaje mando?" };

  const res = explicitTo ? await sendWhatsapp(explicitTo, text) : await notifyOwner(text);
  if (res.ok) {
    return { ok: true, reply: `📲 Mensaje enviado${res.to ? ` a ${res.to}` : " a Luis"}.`, data: res };
  }
  if (res.skipped) {
    return { ok: false, error: res.error, reply: "📲 Puente WhatsApp sin secret configurado — no envié." };
  }
  return { ok: false, error: res.error, reply: `📲 No pude enviar: ${res.error}` };
};

/* ──────────────────────────── plugin-analisis ──────────────────────────── */
/* "analiza | reporta | cómo va" → lee métricas de proyectos y reporta.        */
interface ProjectStatRow {
  name: string;
  category: string | null;
  status: string | null;
  vercel_url: string | null;
  domain: string | null;
}

const analisis: PluginHandler = async (ctx): Promise<PluginResult> => {
  const focus = (extractAfterTrigger(ctx.message, ctx.match) || "").trim();

  if (focus && focus.length > 1) {
    const proj = await queryOne<ProjectStatRow>(
      `SELECT name, category, status, vercel_url, domain
         FROM projects WHERE lower(name) = lower($1) LIMIT 1`,
      [focus],
    ).catch(() => null);
    if (proj) {
      return {
        ok: true,
        reply:
          `📊 **${proj.name}**\n` +
          `• Categoría: ${proj.category ?? "—"}\n` +
          `• Estado: ${proj.status ?? "—"}\n` +
          `• URL: ${proj.domain ?? proj.vercel_url ?? "—"}`,
        data: proj,
      };
    }
  }

  // Reporte global.
  const rows = await queryAll<{ category: string; n: number }>(
    `SELECT COALESCE(category,'sin_categoria') AS category, COUNT(*)::int AS n
       FROM projects GROUP BY 1 ORDER BY n DESC`,
  ).catch(() => []);
  if (!rows.length) return { ok: true, reply: "📊 No hay proyectos registrados todavía.", data: [] };
  const total = rows.reduce((s, r) => s + r.n, 0);
  const lines = rows.map((r) => `• ${r.category}: ${r.n}`).join("\n");
  return { ok: true, reply: `📊 Portafolio (${total} proyectos):\n${lines}`, data: rows };
};

/* ──────────────────────────── plugin-propuesta ──────────────────────────── */
/* "propuesta para | cotiza | precio de" → genera una propuesta en markdown.   */
const propuesta: PluginHandler = async (ctx): Promise<PluginResult> => {
  const subject = (extractAfterTrigger(ctx.message, ctx.match) || "el proyecto").trim().replace(/[.?!]+$/, "");
  const fecha = (ctx.args?.fecha as string) || "fecha por definir";
  const md =
    `# Propuesta comercial — ${cap(subject)}\n\n` +
    `**De:** All Global Holding LLC / V·Momentum\n` +
    `**Para:** ${cap(subject)}\n` +
    `**Fecha:** ${fecha}\n\n` +
    `## Alcance\n` +
    `Desarrollo y puesta en producción de la solución para ${subject}, ` +
    `construida sobre el stack V·Momentum (Next.js · Neon · Clerk · Vercel).\n\n` +
    `## Entregables\n` +
    `- App/PWA responsiva (público · usuario · admin)\n` +
    `- Panel de administración funcional\n` +
    `- Despliegue en dominio propio + soporte de arranque\n\n` +
    `## Inversión (estimada)\n` +
    `| Concepto | Monto |\n|---|---|\n` +
    `| Desarrollo | a cotizar |\n| Operación mensual | a cotizar |\n\n` +
    `## Siguiente paso\n` +
    `Confirmar alcance y arrancar. — _Generado por V_`;
  return {
    ok: true,
    reply: `📄 Propuesta para **${cap(subject)}** lista (markdown abajo). PDF disponible al confirmar.\n\n${md}`,
    data: { subject, markdown: md },
  };
};

/* ───────────────────────────────── utils ───────────────────────────────── */
function extractAfterTrigger(message: string, match: RegExpMatchArray | null): string {
  if (!match || match.index == null) return message.trim();
  return message.slice(match.index + match[0].length).trim();
}
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mapa slug → handler para despacho en proceso de plugins nativos. */
export const NATIVE_HANDLERS: Record<string, PluginHandler> = {
  higgsfield,
  deploy,
  whatsapp,
  analisis,
  propuesta,
};
