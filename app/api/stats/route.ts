import { queryOne } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Stats {
  total_projects: number;
  produccion: number;
  activo: number;
  en_revision: number;
  en_pausa: number;
  archivo: number;
  pendiente_borrado: number;
  forge_turns: number;
  forge_cost_today_usd: number;
}

/**
 * GET /api/stats
 *
 * Live counts for the /hub dashboard. Replaces the static
 * HUB_STATS that used to live in lib/mock-data.ts.
 */
export async function GET() {
  const projectsByCategory = await queryOne<{
    total: number;
    produccion: number;
    activo: number;
    en_revision: number;
    en_pausa: number;
    archivo: number;
    pendiente_borrado: number;
  }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE category = 'produccion')::int AS produccion,
       COUNT(*) FILTER (WHERE category = 'activo')::int AS activo,
       COUNT(*) FILTER (WHERE category = 'en_revision')::int AS en_revision,
       COUNT(*) FILTER (WHERE category = 'en_pausa')::int AS en_pausa,
       COUNT(*) FILTER (WHERE category = 'archivo')::int AS archivo,
       COUNT(*) FILTER (WHERE category = 'pendiente_borrado')::int AS pendiente_borrado
     FROM projects`,
  );

  const forgeStats = await queryOne<{ turns: number; cost: number }>(
    `SELECT
       COUNT(*)::int AS turns,
       COALESCE(SUM(cost_usd), 0)::numeric AS cost
     FROM conversations
     WHERE role = 'assistant' AND created_at >= now() - interval '24 hours'`,
  );

  const stats: Stats = {
    total_projects: projectsByCategory?.total ?? 0,
    produccion: projectsByCategory?.produccion ?? 0,
    activo: projectsByCategory?.activo ?? 0,
    en_revision: projectsByCategory?.en_revision ?? 0,
    en_pausa: projectsByCategory?.en_pausa ?? 0,
    archivo: projectsByCategory?.archivo ?? 0,
    pendiente_borrado: projectsByCategory?.pendiente_borrado ?? 0,
    forge_turns: forgeStats?.turns ?? 0,
    forge_cost_today_usd: Number(forgeStats?.cost ?? 0),
  };

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
