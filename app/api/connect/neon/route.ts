import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/neon — Neon NO ofrece registro self-serve de OAuth
 * apps (solo partners), así que va por API key validada. Se valida
 * listando proyectos y se guarda cifrada en el vault del usuario.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || body.apiKey || "").trim();
  if (!key) return Response.json({ ok: false, error: "Falta la API key" }, { status: 400 });

  try {
    const r = await fetch("https://console.neon.tech/api/v2/projects?limit=1", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!r.ok) {
      return Response.json({ ok: false, error: `Neon rechazó la llave (${r.status})` });
    }
    const d = (await r.json()) as { projects?: Array<{ name?: string }> };
    await saveUserSecret(userId, "NEON_API_KEY", key, "neon");
    const first = d.projects?.[0]?.name;
    return Response.json({ ok: true, account: first ? `Neon · ${first}…` : "Neon account" });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
