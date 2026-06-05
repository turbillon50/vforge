import { queryAll } from "@/lib/db/client";
import { recall } from "@/lib/forge/semantic-recall";
import { isOwnerEmail } from "@/lib/auth/owner";
import { clerkClient } from "@clerk/nextjs/server";

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "vforge_brain_search",
    description:
      "Busca en la memoria y el método de VForge (knowledge base + memoria semántica): el método de construcción, decisiones de arquitectura, lecciones, runbooks. Devuelve los fragmentos más relevantes.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Qué buscar" } }, required: ["query"] },
  },
  {
    name: "vforge_skill_list",
    description: "Lista las skills (capacidades/flujos) disponibles en VForge con su descripción.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_integration_plan",
    description:
      "Dado el alcance de un proyecto (tipo de app y features), recomienda qué servicios/cuentas necesita conectar (GitHub, Vercel, Stripe, Neon, etc.) con el porqué de cada uno.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Tipo de app (ecommerce, servicios, comunidad, etc.)" },
        features: { type: "array", items: { type: "string" }, description: "Features: pagos, emails, base de datos, sms, auth, mapa…" },
      },
    },
  },
  {
    name: "vforge_recommend_stack",
    description: "Recomienda el stack técnico validado de VForge (Next.js + TS + Tailwind + Clerk + Neon + Vercel) y por qué, según el tipo de proyecto.",
    inputSchema: { type: "object", properties: { type: { type: "string" } } },
  },
  {
    name: "vforge_project_status",
    description: "Estado de los proyectos del usuario en VForge (solo lo que le pertenece). Requiere que el usuario tenga proyectos.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function isOwner(userId: string): Promise<boolean> {
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);
    return (u.emailAddresses ?? []).some((e) => isOwnerEmail(e.emailAddress));
  } catch { return false; }
}

function text(t: string) {
  return { content: [{ type: "text", text: t }] };
}

export async function runMcpTool(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case "vforge_brain_search": {
      const q = String(args.query ?? "").slice(0, 300);
      if (!q) return { ...text("Falta 'query'."), isError: true };
      const hits = await recall(q, 6).catch(() => []);
      const kb = await queryAll<{ title: string; content: string }>(
        "SELECT title, content FROM knowledge_base WHERE content ILIKE $1 OR title ILIKE $1 ORDER BY created_at DESC LIMIT 5",
        ["%" + q + "%"],
      ).catch(() => []);
      const out = [
        ...hits.map((h) => `• ${h.content.slice(0, 400)}`),
        ...kb.map((k) => `• [${k.title}] ${k.content.slice(0, 400)}`),
      ].join("\n\n") || "Sin resultados.";
      return text(out);
    }
    case "vforge_skill_list": {
      const rows = await queryAll<{ name: string; description: string }>(
        "SELECT name, description FROM skills WHERE active = true ORDER BY name LIMIT 80",
      ).catch(() => []);
      return text(rows.map((r) => `• ${r.name} — ${r.description ?? ""}`).join("\n") || "Sin skills.");
    }
    case "vforge_integration_plan": {
      const { recommendFromScope } = await import("@/lib/integrations/recommend");
      const recs = recommendFromScope({
        appType: String(args.type ?? ""),
        features: Array.isArray(args.features) ? (args.features as string[]) : [],
      } as never);
      const { CATALOG } = await import("@/lib/integrations/catalog");
      const lines = recs.map((r: { id: string }) => {
        const c = CATALOG[r.id];
        return c ? `• ${c.name} — ${c.why}` : `• ${r.id}`;
      });
      return text("Tu proyecto necesita conectar:\n" + lines.join("\n"));
    }
    case "vforge_recommend_stack": {
      return text(
        "Stack validado de VForge:\n• Next.js (App Router) + TypeScript — base sólida y SSR.\n• Tailwind — diseño rápido y consistente.\n• Clerk — autenticación (social login, passkeys) sin construir auth.\n• Neon (Postgres serverless) — base de datos.\n• Vercel — despliegue continuo y dominios.\n• Stripe / Mercado Pago — pagos.\nVForge conecta todo esto por OAuth/API key y opera por conversación.",
      );
    }
    case "vforge_project_status": {
      const owner = await isOwner(userId);
      if (!owner) return text("No tienes proyectos registrados todavía. Crea uno desde tu workspace de VForge.");
      const rows = await queryAll<{ name: string; category: string; status: string; vercel_url: string | null }>(
        "SELECT name, category, status, vercel_url FROM projects ORDER BY name LIMIT 60",
      ).catch(() => []);
      return text(rows.map((r) => `• ${r.name} [${r.category}] ${r.vercel_url ?? ""}`).join("\n") || "Sin proyectos.");
    }
    default:
      return { ...text(`Tool desconocida: ${name}`), isError: true };
  }
}
