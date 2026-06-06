import { queryAll, ensureDatabaseHealed } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PortfolioRow {
  project_id: string;
  client_name: string;
  status: string;
  total_mxn: string | number;
  paid_mxn: string | number;
  next_milestone: string | null;
  updated_at: string;
  last_activity_title: string | null;
  last_activity_at: string | null;
}

/**
 * GET /api/forge/portfolio
 *
 * Cartera de clientes: estado, cobranza (total/pagado/debe en MXN),
 * siguiente hito y ultima actividad por proyecto.
 */
export async function GET() {
  try {
    await ensureDatabaseHealed();
    const rows = await queryAll<PortfolioRow>(
      `SELECT s.project_id, s.client_name, s.status,
              s.total_mxn, s.paid_mxn, s.next_milestone, s.updated_at,
              a.title AS last_activity_title, a.created_at AS last_activity_at
         FROM client_project_status s
         LEFT JOIN LATERAL (
           SELECT title, created_at
             FROM v_project_activity
            WHERE project_id = s.project_id
            ORDER BY created_at DESC
            LIMIT 1
         ) a ON true
        ORDER BY s.client_name ASC`,
    );

    const projects = rows.map((r) => {
      const total = Number(r.total_mxn) || 0;
      const paid = Number(r.paid_mxn) || 0;
      return {
        project_id: r.project_id,
        client_name: r.client_name,
        status: r.status,
        total_mxn: total,
        paid_mxn: paid,
        debe: total - paid,
        next_milestone: r.next_milestone,
        updated_at: r.updated_at,
        last_activity: r.last_activity_title
          ? { title: r.last_activity_title, created_at: r.last_activity_at }
          : null,
      };
    });

    const totals = projects.reduce(
      (acc, p) => ({
        total: acc.total + p.total_mxn,
        paid: acc.paid + p.paid_mxn,
        debe: acc.debe + p.debe,
      }),
      { total: 0, paid: 0, debe: 0 },
    );

    return new Response(JSON.stringify({ projects, totals }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `db error: ${message}`, projects: [], totals: { total: 0, paid: 0, debe: 0 } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
