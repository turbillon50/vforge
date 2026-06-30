import { auth } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dominios — con el Vercel conectado del usuario.
 *  GET  ?name=example.com  → { available, price, period }
 *  POST { name, expectedPrice } → compra (cobra a SU Vercel). Confirmación
 *  explícita en la UI; nunca se compra solo.
 */
async function vercelToken(userId: string) {
  const token = await getUserSecret(userId, "VERCEL_USER_TOKEN");
  const team = await getUserSecret(userId, "VERCEL_TEAM_ID");
  return { token, team };
}
function q(team: string | null, extra = "") {
  const t = team ? `teamId=${encodeURIComponent(team)}` : "";
  return [t, extra].filter(Boolean).join("&");
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const name = new URL(req.url).searchParams.get("name")?.trim().toLowerCase();
  if (!name || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) return Response.json({ ok: false, error: "dominio_invalido" }, { status: 400 });
  const { token, team } = await vercelToken(userId);
  if (!token) return Response.json({ ok: false, error: "connect_vercel" }, { status: 400 });
  try {
    const h = { Authorization: `Bearer ${token}` };
    const sRes = await fetch(`https://api.vercel.com/v4/domains/status?${q(team, "name=" + encodeURIComponent(name))}`, { headers: h });
    const sData = await sRes.json();
    const available = !!sData.available;
    let price = null, period = null;
    if (available) {
      const pRes = await fetch(`https://api.vercel.com/v4/domains/price?${q(team, "name=" + encodeURIComponent(name))}`, { headers: h });
      if (pRes.ok) { const pData = await pRes.json(); price = pData.price ?? null; period = pData.period ?? 1; }
    }
    return Response.json({ ok: true, name, available, price, period });
  } catch (e) {
    return Response.json({ ok: false, error: "exception", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(b.name || "").trim().toLowerCase();
  const expectedPrice = Number(b.expectedPrice || 0);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) return Response.json({ ok: false, error: "dominio_invalido" }, { status: 400 });
  if (!expectedPrice) return Response.json({ ok: false, error: "falta_precio" }, { status: 400 });
  const { token, team } = await vercelToken(userId);
  if (!token) return Response.json({ ok: false, error: "connect_vercel" }, { status: 400 });
  try {
    const bRes = await fetch(`https://api.vercel.com/v5/domains/buy?${q(team)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, expectedPrice, renew: true }),
    });
    const data = await bRes.json();
    if (!bRes.ok) return Response.json({ ok: false, error: "compra", detail: data }, { status: 400 });
    return Response.json({ ok: true, name, bought: true });
  } catch (e) {
    return Response.json({ ok: false, error: "exception", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
