/**
 * GET /api/forge/cost?period=today|24h|this_month|last_7d|last_30d
 *
 * Real-time consumption report aggregated from the conversations table.
 * Used by /activity dashboard and by V's forge_cost_report tool to
 * surface live spend without inventing numbers.
 *
 * Response shape:
 *   {
 *     period: string,
 *     since: string (ISO),
 *     until: string (ISO),
 *     total_usd: number,
 *     total_turns: number,
 *     total_tokens_in: number,
 *     total_tokens_out: number,
 *     by_model: [{ model, turns, tokens_in, tokens_out, cost_usd }],
 *     by_day:   [{ day, turns, cost_usd }],   // last N days, oldest first
 *     fallback_events: number,                 // cuántos turnos hicieron fallback
 *   }
 *
 * Read-only. No auth required for the operator-MVP (Clerk lands in M11).
 */
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period = "today" | "24h" | "this_month" | "last_7d" | "last_30d";

function resolvePeriod(input: string | null): {
  period: Period;
  since: Date;
  until: Date;
} {
  const now = new Date();
  const p = (input ?? "today") as Period;
  let since: Date;
  switch (p) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "this_month":
      since = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
      break;
    case "last_7d":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "today":
    default:
      since = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      break;
  }
  return { period: p, since, until: now };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { period, since, until } = resolvePeriod(searchParams.get("period"));
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  // Aggregate totals across all assistant turns in the window.
  const [totals] = (await sql`
    SELECT
      COALESCE(SUM(cost_usd), 0)::numeric(12,6) AS total_usd,
      COUNT(*)::int AS total_turns,
      COALESCE(SUM(tokens_in), 0)::int AS total_tokens_in,
      COALESCE(SUM(tokens_out), 0)::int AS total_tokens_out
    FROM conversations
    WHERE role = 'assistant'
      AND created_at >= ${sinceIso}
      AND created_at <= ${untilIso}
  `) as Array<{
    total_usd: string;
    total_turns: number;
    total_tokens_in: number;
    total_tokens_out: number;
  }>;

  // Per-model breakdown.
  const byModel = (await sql`
    SELECT
      COALESCE(model, '(unknown)') AS model,
      COUNT(*)::int AS turns,
      COALESCE(SUM(tokens_in), 0)::int AS tokens_in,
      COALESCE(SUM(tokens_out), 0)::int AS tokens_out,
      COALESCE(SUM(cost_usd), 0)::numeric(12,6) AS cost_usd
    FROM conversations
    WHERE role = 'assistant'
      AND created_at >= ${sinceIso}
      AND created_at <= ${untilIso}
    GROUP BY model
    ORDER BY cost_usd DESC
  `) as Array<{
    model: string;
    turns: number;
    tokens_in: number;
    tokens_out: number;
    cost_usd: string;
  }>;

  // Per-day breakdown.
  const byDay = (await sql`
    SELECT
      date_trunc('day', created_at)::date AS day,
      COUNT(*)::int AS turns,
      COALESCE(SUM(cost_usd), 0)::numeric(12,6) AS cost_usd
    FROM conversations
    WHERE role = 'assistant'
      AND created_at >= ${sinceIso}
      AND created_at <= ${untilIso}
    GROUP BY day
    ORDER BY day
  `) as Array<{ day: string; turns: number; cost_usd: string }>;

  // Count how many turns triggered model_fallback (audit_events
  // payload->fallbacks is a JSON array; we check that it's non-empty).
  const [fallbackCount] = (await sql`
    SELECT COUNT(*)::int AS n
    FROM audit_events
    WHERE action = 'forge.chat.turn'
      AND created_at >= ${sinceIso}
      AND created_at <= ${untilIso}
      AND jsonb_array_length(COALESCE(payload->'fallbacks', '[]'::jsonb)) > 0
  `) as Array<{ n: number }>;

  return new Response(
    JSON.stringify({
      period,
      since: sinceIso,
      until: untilIso,
      total_usd: Number(totals.total_usd),
      total_turns: totals.total_turns,
      total_tokens_in: totals.total_tokens_in,
      total_tokens_out: totals.total_tokens_out,
      by_model: byModel.map((m) => ({
        model: m.model,
        turns: m.turns,
        tokens_in: m.tokens_in,
        tokens_out: m.tokens_out,
        cost_usd: Number(m.cost_usd),
      })),
      by_day: byDay.map((d) => ({
        day: d.day,
        turns: d.turns,
        cost_usd: Number(d.cost_usd),
      })),
      fallback_events: fallbackCount.n,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
