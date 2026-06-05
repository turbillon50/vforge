import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/google_maps — guarda la API key de Google Maps. La
 * validación real depende de qué APIs habilitó el usuario; hacemos una
 * verificación ligera de formato y un ping a Geocoding (puede dar
 * REQUEST_DENIED si la API no está habilitada, lo cual NO invalida la key).
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || body.apiKey || "").trim();
  if (!key || key.length < 20) return Response.json({ ok: false, error: "API key inválida o muy corta" }, { status: 400 });
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${encodeURIComponent(key)}`);
    const d = (await r.json()) as { status?: string; error_message?: string };
    // Key inválida de verdad → status INVALID_REQUEST con "API key not valid".
    if (d.error_message && /api key not valid/i.test(d.error_message)) {
      return Response.json({ ok: false, error: "Google rechazó la API key." });
    }
    await saveUserSecret(userId, "GOOGLE_MAPS_API_KEY", key, "google_maps");
    return Response.json({ ok: true, account: "Google Maps key guardada" });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
