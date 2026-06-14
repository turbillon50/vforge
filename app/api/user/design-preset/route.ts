import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return neon(url);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    const sql = getDb();
    await sql`
      CREATE TABLE IF NOT EXISTS user_design_presets (
        user_id text PRIMARY KEY,
        preset jsonb NOT NULL,
        updated_at timestamptz DEFAULT now()
      )
    `;
    const rows = await sql`
      SELECT preset FROM user_design_presets WHERE user_id = ${userId}
    `;
    return NextResponse.json({ ok: true, preset: rows[0]?.preset ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    const preset = await req.json();
    const sql = getDb();
    await sql`
      CREATE TABLE IF NOT EXISTS user_design_presets (
        user_id text PRIMARY KEY,
        preset jsonb NOT NULL,
        updated_at timestamptz DEFAULT now()
      )
    `;
    await sql`
      INSERT INTO user_design_presets (user_id, preset, updated_at)
      VALUES (${userId}, ${JSON.stringify(preset)}::jsonb, now())
      ON CONFLICT (user_id)
      DO UPDATE SET preset = EXCLUDED.preset, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
