import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/connect/twilio — valida Account SID + Auth Token contra la API
 * de Twilio y los guarda cifrados. body: { key: "AC...:authtoken" } o
 * { sid, token }.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  let sid = String(body.sid || "").trim();
  let token = String(body.token || "").trim();
  if (!sid && typeof body.key === "string" && body.key.includes(":")) {
    [sid, token] = body.key.split(":").map((x: string) => x.trim());
  }
  if (!sid || !token) return Response.json({ ok: false, error: "Falta Account SID y Auth Token (formato AC...:token)" }, { status: 400 });
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") },
    });
    if (!r.ok) return Response.json({ ok: false, error: `Twilio rechazó las credenciales (${r.status})` });
    await saveUserSecret(userId, "TWILIO_ACCOUNT_SID", sid, "twilio");
    await saveUserSecret(userId, "TWILIO_AUTH_TOKEN", token, "twilio");
    return Response.json({ ok: true, account: "Twilio · " + sid.slice(0, 10) + "…" });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
