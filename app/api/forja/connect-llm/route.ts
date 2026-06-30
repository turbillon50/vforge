import { auth } from "@clerk/nextjs/server";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/forja/connect-llm { provider: "anthropic"|"openai"|"gemini", key }
 * Valida la API key del usuario contra el proveedor y la guarda en SU bóveda.
 * Su V correrá con su modelo (BYO-key). Sin key, usa el V de la casa.
 */
const NAMES: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};

async function validate(provider: string, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      });
      return r.ok ? { ok: true } : { ok: false, error: `Anthropic rechazó la key (${r.status})` };
    }
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return r.ok ? { ok: true } : { ok: false, error: `OpenAI rechazó la key (${r.status})` };
    }
    if (provider === "gemini") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key));
      return r.ok ? { ok: true } : { ok: false, error: `Gemini rechazó la key (${r.status})` };
    }
    return { ok: false, error: "proveedor desconocido" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "error" };
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const provider = String(b.provider || "").toLowerCase();
  const key = String(b.key || "").trim();
  if (!NAMES[provider]) return Response.json({ ok: false, error: "proveedor_invalido" }, { status: 400 });
  if (key.length < 12) return Response.json({ ok: false, error: "key_corta" }, { status: 400 });

  const v = await validate(provider, key);
  if (!v.ok) return Response.json({ ok: false, error: v.error }, { status: 400 });

  await saveUserSecret(userId, NAMES[provider], key, "llm");
  await saveUserSecret(userId, "LLM_PROVIDER", provider, "llm");
  return Response.json({ ok: true, provider });
}
