/**
 * Comentarios del link público permanente /s/{token}.
 * Sin login: el cliente deja mensajes; el owner los ve en la sala live (eventos).
 * Rate limit simple por IP en memoria de instancia (no es anti-abuso fuerte).
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveShareToken } from "@/lib/projects/share-link";
import { queryOne, queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const MAX_BODY = 4000;
const MAX_NAME = 80;

const hits = new Map<string, { n: number; t: number }>();
function rateOk(key: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now - row.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    return true;
  }
  if (row.n >= max) return false;
  row.n += 1;
  return true;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const project = await resolveShareToken(token);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const comments = await queryAll<{
    id: string;
    author_email: string;
    author_name: string | null;
    body: string;
    created_at: string;
  }>(
    `SELECT id, author_email, author_name, body, created_at
       FROM project_comments
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [project.id],
  );

  return NextResponse.json({ comments }, { headers: noStore });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const project = await resolveShareToken(token);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!rateOk(`s:${token}:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  }

  const payload: unknown = await req.json().catch(() => null);
  const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const rawBody = obj && typeof obj.body === "string" ? obj.body : "";
  const rawName = obj && typeof obj.name === "string" ? obj.name : "";
  const body = rawBody.trim().slice(0, MAX_BODY);
  const name = rawName.trim().slice(0, MAX_NAME) || "Cliente";

  if (!body) {
    return NextResponse.json({ error: "empty" }, { status: 400, headers: noStore });
  }

  // author_email sintético: no es login, solo etiqueta en el feed del owner
  const authorEmail = `guest+${token.slice(0, 8)}@share.vforge.local`;

  const comment = await queryOne<{
    id: string;
    author_email: string;
    author_name: string | null;
    body: string;
    created_at: string;
  }>(
    `WITH created AS (
       INSERT INTO project_comments
         (project_id, author_clerk_id, author_email, author_name, body)
       VALUES ($1, NULL, $2, $3, $4)
       RETURNING id, author_email, author_name, body, created_at
     ), activity AS (
       INSERT INTO project_events (project_id, event_type, details, severity)
       SELECT $1,
              'comment.created',
              jsonb_build_object(
                'message', 'Mensaje de ' || $3 || ' (link público)',
                'comment_id', id,
                'source', 'share_link'
              ),
              'low'
         FROM created
     )
     SELECT id, author_email, author_name, body, created_at FROM created`,
    [project.id, authorEmail, name, body],
  );

  if (!comment) {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ comment }, { status: 201, headers: noStore });
}
