import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/clerk — Clerk no ofrece OAuth para conectar una cuenta,
 * así que validamos la Secret Key (sk_...) contra su API. Si es válida la
 * guardamos cifrada en el vault del usuario.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || body.apiKey || "").trim();
  if (!key) return Response.json({ ok: false, error: "Falta la Secret Key" }, { status: 400 });

  try {
    const r = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      return Response.json({ ok: false, error: `Clerk rechazó la llave (${r.status})` });
    }
    await saveUserSecret(userId, "CLERK_SECRET_KEY", key, "clerk");
    return Response.json({ ok: true, account: "Clerk instance" });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
