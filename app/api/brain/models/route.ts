import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Brain dispatch DB (Neon). Override via BRAIN_DATABASE_URL in prod.
const BRAIN_DATABASE_URL =
  process.env.BRAIN_DATABASE_URL ??
  "os.environ.get("BRAIN_DATABASE_URL","")s-east-1.aws.neon.tech/neondb?sslmode=require";

/**
 * GET /api/brain/models
 *
 * Returns router_stats per task_type/model with a computed Thompson-sampling
 * win rate (alpha / (alpha + beta)), sorted best-first within each task_type.
 */
export async function GET() {
  try {
    const sql = neon(BRAIN_DATABASE_URL);
    const rows = await sql`
      SELECT task_type, modelo, alpha, beta,
             ROUND(alpha::numeric / (alpha + beta) * 100, 1) AS win_rate
        FROM router_stats
        ORDER BY task_type, win_rate DESC
    `;
    return NextResponse.json({ ok: true, models: rows, ts: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, ts: Date.now() },
      { status: 500 },
    );
  }
}
