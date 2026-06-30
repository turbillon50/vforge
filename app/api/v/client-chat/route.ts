import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v/client-chat  { message, history? }
 * V para CLIENTES — asistente seguro por tenant. Sin contexto de owner ni datos
 * de otros usuarios. Corre en la GPU de V (gratis). BYO-key (Anthropic/OpenAI/
 * Gemini) se enchufa después leyendo la bóveda del usuario.
 */
const SYSTEM = `Eres V, la asistente de VForge. Hablas español, cálida y breve.
Ayudas al usuario a: conectar sus herramientas (GitHub, Vercel, Stripe), crear y
publicar su app (botón "Crear app"), y cobrar con su Stripe (botón "Cobrar").
No tienes acceso a datos de otros usuarios ni del operador. Si no sabes algo,
dilo y sugiere el siguiente paso concreto.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const message = String(b.message || "").trim().slice(0, 4000);
  if (!message) return Response.json({ ok: false, error: "empty" }, { status: 400 });
  const history = Array.isArray(b.history)
    ? (b.history as { role: string; content: string }[]).slice(-10).map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) }))
    : [];

  const base = process.env.HETZNER_V_URL || "http://178.105.135.26/v/chat";
  const secret = process.env.HETZNER_SECRET || "";
  if (!secret) return Response.json({ ok: false, error: "v_unavailable" }, { status: 503 });
  const url = base.endsWith("/v/chat-full") ? base : base.replace(/\/v\/chat.*/, "/v/chat-full");

  try {
    const up = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, message, history, session_id: "client-" + userId, system_prompt: SYSTEM }),
      signal: AbortSignal.timeout(60000),
    });
    if (!up.ok) return Response.json({ ok: false, error: "v_upstream" }, { status: 502 });
    const d = (await up.json()) as { reply?: string; error?: string };
    if (!d.reply) return Response.json({ ok: false, error: d.error || "no_reply" }, { status: 502 });
    return Response.json({ ok: true, reply: d.reply });
  } catch (e) {
    return Response.json({ ok: false, error: "exception", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
