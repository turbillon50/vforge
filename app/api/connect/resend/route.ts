import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/resend — Resend usa API key (no OAuth). Validamos la
 * key (re_...) contra su API listando dominios. Si es válida la guardamos
 * cifrada en el vault del usuario.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || body.apiKey || "").trim();
  if (!key) return Response.json({ ok: false, error: "Falta la API key" }, { status: 400 });

  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      return Response.json({ ok: false, error: `Resend rechazó la llave (${r.status})` });
    }
    await saveUserSecret(userId, "RESEND_API_KEY", key, "resend");
    return Response.json({ ok: true, account: "Resend account" });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
