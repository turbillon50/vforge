/**
 * /api/v-diag — DIAGNOSTICO TEMPORAL del motor de V (chat).
 * Protegido por header x-vdiag. Borrar cuando V este estable.
 * No toca personalidad ni DB: solo lee config/keys y prueba el motor.
 */
import OpenAI from "openai";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { getModelForTask } from "@/lib/forge/agent-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = "vdiag-lux-9f31c7";

export async function POST(req: Request) {
  if (req.headers.get("x-vdiag") !== SECRET) {
    return Response.json({ error: "no" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    test?: boolean;
    message?: string;
  };
  const report: Record<string, unknown> = {};

  const orKey = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: "operator_luis",
  });
  const geminiKey = await getOperatorSecret("GEMINI_API_KEY", {
    auditUserId: "operator_luis",
  });
  const anthropicKey = await getOperatorSecret("ANTHROPIC_API_KEY", {
    auditUserId: "operator_luis",
  });
  report.keys = {
    openrouter: orKey
      ? {
          present: true,
          prefix: orKey.slice(0, 12),
          len: orKey.length,
          ascii: /^[\x20-\x7e]+$/.test(orKey),
        }
      : { present: false },
    gemini: Boolean(geminiKey),
    anthropic: Boolean(anthropicKey),
  };

  report.chatMainModel = await getModelForTask("chat-main").catch(
    (e) => "ERR:" + String(e),
  );

  if (orKey) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/credits", {
        headers: { Authorization: `Bearer ${orKey}` },
        cache: "no-store",
      });
      report.openrouterCredits = {
        status: r.status,
        data: await r.json().catch(() => null),
      };
    } catch (e) {
      report.openrouterCredits = { error: String(e) };
    }
  }

  if (body.test && orKey) {
    const { systemPrompt } = await buildSystemPrompt({ projectId: null });
    const client = new OpenAI({
      apiKey: orKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const configured =
      typeof report.chatMainModel === "string" ? report.chatMainModel : "";
    const candidates = [
      configured,
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
    ].filter(
      (m, i, a) =>
        m.includes("/") && !m.startsWith("anthropic/") && a.indexOf(m) === i,
    );
    const errors: unknown[] = [];
    for (const m of candidates) {
      try {
        const c = await client.chat.completions.create({
          model: m,
          max_tokens: 400,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: body.message ?? "Hola V, prueba de vida." },
          ],
        });
        report.test = {
          model: m,
          ok: true,
          text: c.choices?.[0]?.message?.content ?? "",
        };
        break;
      } catch (e) {
        const err = e as { status?: number; message?: string };
        errors.push({
          model: m,
          status: err?.status ?? null,
          msg: String(err?.message ?? e).slice(0, 250),
        });
      }
    }
    if (errors.length) report.testErrors = errors;
  }

  return Response.json(report);
}
