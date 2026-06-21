import { sql } from "@/lib/db/client";
import { checkVaAuth, vaUnauthorized } from "@/lib/va/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/va/v1/analytics — KPIs de VForge (contrato-va-v1).
 * Vocabulario "saas": Proyectos / Builds / Deploys.
 * Read-only. Si no hay DB o no hay datos -> KPIs en 0 y series vacías.
 */

type Kpi = {
  key: string;
  label: string;
  value: number;
  unit?: string;
  delta: number;
};

/** count(*) seguro: 0 si la tabla no existe o falla. */
async function safeCount(query: string): Promise<number> {
  try {
    const r = (await sql.query(query)) as Array<{ n: number }>;
    return r[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

/**
 * delta 30d vs 30d previos para una tabla con created_at.
 * Devuelve { value: total30d, delta: variación fraccional }.
 */
async function windowStats(
  table: string,
): Promise<{ value: number; delta: number }> {
  try {
    const r = (await sql.query(
      `SELECT
         count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS cur,
         count(*) FILTER (WHERE created_at > now() - interval '60 days'
                            AND created_at <= now() - interval '30 days')::int AS prev
       FROM "${table}"`,
    )) as Array<{ cur: number; prev: number }>;
    const cur = r[0]?.cur ?? 0;
    const prev = r[0]?.prev ?? 0;
    const delta = prev > 0 ? Number(((cur - prev) / prev).toFixed(2)) : 0;
    return { value: cur, delta };
  } catch {
    return { value: 0, delta: 0 };
  }
}

/** Serie diaria (últimos 30d) de una tabla con created_at. */
async function dailySeries(
  table: string,
): Promise<Array<{ x: string; y: number }>> {
  try {
    const r = (await sql.query(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS x, count(*)::int AS y
       FROM "${table}"
       WHERE created_at > now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`,
    )) as Array<{ x: string; y: number }>;
    return r;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  if (!checkVaAuth(req)) return vaUnauthorized();

  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: true, range: "30d", kpis: [], series: [] });
  }

  try {
    const [proyectosTotal, builds, deploys, deploysSeries, buildsSeries] =
      await Promise.all([
        safeCount(`SELECT count(*)::int AS n FROM "projects"`),
        windowStats("vforge_builds"),
        windowStats("project_deploys"),
        dailySeries("project_deploys"),
        dailySeries("vforge_builds"),
      ]);

    const kpis: Kpi[] = [
      { key: "stat_1", label: "Proyectos", value: proyectosTotal, delta: 0 },
      {
        key: "stat_2",
        label: "Deploys (30d)",
        value: deploys.value,
        delta: deploys.delta,
      },
      {
        key: "stat_3",
        label: "Builds (30d)",
        value: builds.value,
        delta: builds.delta,
      },
    ];

    const series = [
      { label: "Deploys/día", points: deploysSeries },
      { label: "Builds/día", points: buildsSeries },
    ];

    return Response.json({ ok: true, range: "30d", kpis, series });
  } catch (e) {
    console.error("[va/analytics]", e);
    return Response.json({ ok: true, range: "30d", kpis: [], series: [] });
  }
}
