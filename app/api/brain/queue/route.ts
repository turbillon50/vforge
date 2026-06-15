import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Brain dispatch DB (Neon). Override via BRAIN_DATABASE_URL in prod.
const BRAIN_DATABASE_URL = process.env.BRAIN_DATABASE_URL ?? "";
/**
 * GET /api/brain/queue
 *
 * Returns the 20 most recent dispatch_queue rows for the live queue view.
 */
export async function GET() {
  try {
    const sql = neon(BRAIN_DATABASE_URL);
    const rows = await sql`
      SELECT id, agent, task_type, status, progress_pct,
             LEFT(prompt, 80)  AS prompt_snippet,
             LEFT(result, 120) AS result_snippet,
             grok_verdict, created_at
        FROM dispatch_queue
        ORDER BY created_at DESC
        LIMIT 20
    `;
    return NextResponse.json({ ok: true, queue: rows, ts: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, ts: Date.now() },
      { status: 500 },
    );
  }
}
