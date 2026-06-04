import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function validate(service: string, key: string): Promise<{ ok: boolean; account?: string; error?: string }> {
  const k = key.trim();
  try {
    if (service === "github") {
      const r = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${k}`, "User-Agent": "vforge", Accept: "application/vnd.github+json" } });
      if (!r.ok) return { ok: false, error: `GitHub rechazó la llave (${r.status})` };
      const d = await r.json(); return { ok: true, account: "@" + d.login };
    }
    if (service === "vercel") {
      const r = await fetch("https://api.vercel.com/v2/user", { headers: { Authorization: `Bearer ${k}` } });
      if (!r.ok) return { ok: false, error: `Vercel rechazó la llave (${r.status})` };
      const d = await r.json(); return { ok: true, account: d.user?.username || d.user?.email || "Vercel" };
    }
    if (service === "stripe") {
      const r = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${k}` } });
      if (!r.ok) return { ok: false, error: `Stripe rechazó la llave (${r.status})` };
      const d = await r.json(); return { ok: true, account: d.email || d.id };
    }
    if (k.length < 6) return { ok: false, error: "La llave es muy corta" };
    return { ok: true, account: "guardado" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function POST(req: Request) {
  try { const a = await auth(); if (!a?.userId) return new Response("Unauthorized", { status: 401 }); }
  catch { return new Response("Unauthorized", { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const service = String(body.service || ""); const key = String(body.key || "");
  if (!service || !key) return Response.json({ ok: false, error: "Faltan datos" }, { status: 400 });
  return Response.json(await validate(service, key));
}
