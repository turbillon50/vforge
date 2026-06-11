export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "@/lib/automations/schema";
import { newId } from "@/lib/automations/crm";
import { publishPost, type ScheduledPost } from "@/lib/automations/social";

export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  await ensureAutomationsSchema();
  const posts = (await sql`
    SELECT * FROM scheduled_posts ORDER BY scheduled_at DESC LIMIT 100
  `) as unknown as unknown[];
  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  await ensureAutomationsSchema();
  const b = (await req.json()) as {
    platform: string;
    content: string;
    scheduledAt?: string;
    mediaUrl?: string;
    target?: string;
    bridge?: string;
    publishNow?: boolean;
  };
  if (!b.platform || !b.content) {
    return NextResponse.json({ error: "platform y content requeridos" }, { status: 400 });
  }
  const id = newId("post");
  const when = b.scheduledAt ?? new Date().toISOString();
  const result = b.target || b.bridge ? { target: b.target, bridge: b.bridge } : {};
  const rows = (await sql`
    INSERT INTO scheduled_posts (id, platform, content, media_url, scheduled_at, created_by, result)
    VALUES (${id}, ${b.platform}, ${b.content}, ${b.mediaUrl ?? null}, ${when}, ${gate.email},
            ${JSON.stringify(result)}::jsonb)
    RETURNING *
  `) as unknown as ScheduledPost[];

  if (b.publishNow) {
    const published = await publishPost(rows[0]);
    return NextResponse.json({ ok: true, id, post: published });
  }
  return NextResponse.json({ ok: true, id, post: rows[0] });
}
