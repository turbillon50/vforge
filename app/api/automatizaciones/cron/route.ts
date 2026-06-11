export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cronSecretOk, unauthorized } from "@/lib/automations/auth";
import { tickScheduler } from "@/lib/automations/social";
import { sql } from "@/lib/db/client";
import { runFlow } from "@/lib/automations/engine";
import { ensureAutomationsSchema } from "@/lib/automations/schema";
import type { FlowTrigger } from "@/lib/automations/types";

/**
 * Tick del scheduler. Lo invoca un cron (Vercel Cron o un timer en Hetzner que
 * pega cada minuto). Auth: CRON_SECRET (o BRAIN_SECRET) por header/query.
 *
 * Hace dos cosas:
 *   - procesa scheduled_posts vencidos (social).
 *   - dispara flujos con trigger cron cuyo intervalo (minutos) ya venció.
 */
async function tick() {
  await ensureAutomationsSchema();

  // Social
  const social = await tickScheduler();

  // Flujos con trigger cron (config.everyMinutes)
  const cronTriggers = (await sql`
    SELECT t.* FROM flow_triggers t
    JOIN flows f ON f.id = t.flow_id
    WHERE t.type = 'cron' AND t.active = true AND f.status = 'active'
  `) as unknown as FlowTrigger[];

  const firedFlows: Array<{ flowId: string; runId: string; status: string }> = [];
  for (const t of cronTriggers) {
    const everyMin = Number((t.config as { everyMinutes?: number })?.everyMinutes ?? 0);
    if (everyMin <= 0) continue;
    const last = t.last_fired_at ? new Date(t.last_fired_at).getTime() : 0;
    if (Date.now() - last < everyMin * 60_000) continue;
    const res = await runFlow(t.flow_id, { triggerId: t.id, triggerType: "cron" });
    await sql`UPDATE flow_triggers SET last_fired_at = now() WHERE id = ${t.id}`;
    firedFlows.push({ flowId: t.flow_id, runId: res.runId, status: res.status });
  }

  return { social, firedFlows };
}

export async function POST(req: Request) {
  if (!cronSecretOk(req)) return unauthorized();
  return NextResponse.json({ ok: true, ...(await tick()) });
}

export async function GET(req: Request) {
  if (!cronSecretOk(req)) return unauthorized();
  return NextResponse.json({ ok: true, ...(await tick()) });
}
