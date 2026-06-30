import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// TEMPORAL: suelta el CHECK de scope que bloqueaba guardar conexiones. Borrar después.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauth" }, { status: 401 });
  const dburl = process.env.DATABASE_URL;
  if (!dburl) return Response.json({ error: "no_db" });
  const sql = neon(dburl);
  try {
    await sql`ALTER TABLE user_secrets DROP CONSTRAINT IF EXISTS user_secrets_scope_check`;
    return Response.json({ ok: true, dropped: "user_secrets_scope_check" });
  } catch (e) {
    return Response.json({ ok: false, err: e instanceof Error ? e.message : String(e) });
  }
}
