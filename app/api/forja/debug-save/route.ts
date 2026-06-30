import { auth } from "@clerk/nextjs/server";
import { saveUserSecret, getUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORAL: diagnóstico de por qué no se guardan los tokens. Borrar después.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauth" }, { status: 401 });
  const out: Record<string, unknown> = { userId, hasDbUrl: !!process.env.DATABASE_URL };
  try { await saveUserSecret(userId, "DEBUG_TEST", "hello", "debug"); out.save = "ok"; }
  catch (e) { out.save = "FAIL"; out.saveErr = e instanceof Error ? e.message : String(e); }
  try { out.read = (await getUserSecret(userId, "DEBUG_TEST")) ? "ok" : "null"; }
  catch (e) { out.readErr = e instanceof Error ? e.message : String(e); }
  return Response.json(out);
}
