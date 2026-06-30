import { auth } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v/client-chat { message, history? }
 * V para CLIENTES — seguro por tenant. Si el usuario conectó su API key
 * (Anthropic/OpenAI/Gemini, BYO-key) corre con SU modelo; si no, el V de la
 * casa (qwen en la GPU de V, gratis). Sin contexto de owner ni de otros.
 */
const SYSTEM = `Eres V, la asistente de VForge. Hablas español, cálida y breve.
Ayudas al usuario a conectar sus herramientas (GitHub, Vercel, Stripe), crear y
publicar su app ("Crear app") y cobrar con su Stripe ("Cobrar"). No tienes
acceso a datos de otros usuarios ni del operador. Si no sabes algo, dilo y
sugiere el siguiente paso concreto.`;

type Turn = { role: string; content: string };

async function viaAnthropic(key: string, message: string, history: Turn[]): Promise<string | null> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest", max_tokens: 1024, system: SYSTEM,
      messages: [...history.map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })), { role: "user", content: message }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d?.content?.[0]?.text || null;
}

async function viaOpenAI(key: string, message: string, history: Turn[]): Promise<string | null> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM }, ...history.map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content })), { role: "user", content: message }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d?.choices?.[0]?.message?.content || null;
}

async function viaGemini(key: string, message: string, history: Turn[]): Promise<string | null> {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [...history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })), { role: "user", parts: [{ text: message }] }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function viaHouseV(message: string, history: Turn[], userId: string): Promise<string | null> {
  const base = process.env.HETZNER_V_URL || "http://178.105.135.26/v/chat";
  const secret = process.env.HETZNER_SECRET || "";
  if (!secret) return null;
  const url = base.endsWith("/v/chat-full") ? base : base.replace(/\/v\/chat.*/, "/v/chat-full");
  const up = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, message, history, session_id: "client-" + userId, system_prompt: SYSTEM }),
    signal: AbortSignal.timeout(60000),
  });
  if (!up.ok) return null;
  const d = (await up.json()) as { reply?: string };
  return d.reply || null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const message = String(b.message || "").trim().slice(0, 4000);
  if (!message) return Response.json({ ok: false, error: "empty" }, { status: 400 });
  const history: Turn[] = Array.isArray(b.history)
    ? (b.history as Turn[]).slice(-10).map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) }))
    : [];

  // BYO-key: si el usuario conectó un proveedor, usar su modelo.
  let reply: string | null = null;
  let used = "casa";
  try {
    const provider = await getUserSecret(userId, "LLM_PROVIDER");
    if (provider === "anthropic") {
      const k = await getUserSecret(userId, "ANTHROPIC_API_KEY");
      if (k) { reply = await viaAnthropic(k, message, history); used = "anthropic"; }
    } else if (provider === "openai") {
      const k = await getUserSecret(userId, "OPENAI_API_KEY");
      if (k) { reply = await viaOpenAI(k, message, history); used = "openai"; }
    } else if (provider === "gemini") {
      const k = await getUserSecret(userId, "GEMINI_API_KEY");
      if (k) { reply = await viaGemini(k, message, history); used = "gemini"; }
    }
  } catch { /* cae a la casa */ }

  if (!reply) { reply = await viaHouseV(message, history, userId); used = "casa"; }
  if (!reply) return Response.json({ ok: false, error: "v_unavailable" }, { status: 503 });
  return Response.json({ ok: true, reply, model: used });
}
