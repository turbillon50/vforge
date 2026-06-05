/**
 * /api/v-diag — DIAGNOSTICO TEMPORAL del motor de V (chat).
 * Protegido por header x-vdiag. Borrar cuando V este estable.
 */
import OpenAI from "openai";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { getModelForTask, setModelForTask } from "@/lib/forge/agent-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = "vdiag-lux-9f31c7";

export async function POST(req: Request) {
  if (req.headers.get("x-vdiag") !== SECRET) {
    return Response.json({ error: "no" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    test?: boolean;
    models?: string[];
    gemini_names?: string[];
    test_gemini?: boolean;
    gemini_model?: string;
    set_model?: { task: string; model: string };
    message?: string;
  };
  const report: Record<string, unknown> = {};

  if (body.set_model) {
    try {
      report.set_model = await setModelForTask(
        body.set_model.task as Parameters<typeof setModelForTask>[0],
        body.set_model.model,
        { updatedBy: "v-diag" },
      );
    } catch (e) {
      report.set_model = { error: String(e) };
    }
  }

  const orKey = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: "operator_luis",
  });
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

  if (body.gemini_names) {
    const out: Record<string, unknown> = {};
    for (const n of body.gemini_names) {
      const k = await getOperatorSecret(n, { auditUserId: "operator_luis" });
      if (!k) {
        out[n] = null;
        continue;
      }
      try {
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models?key=" +
            encodeURIComponent(k),
          { cache: "no-store" },
        );
        out[n] = { prefix: k.slice(0, 8), len: k.length, modelsStatus: r.status };
      } catch (e) {
        out[n] = { prefix: k.slice(0, 8), error: String(e).slice(0, 120) };
      }
    }
    report.gemini_keys = out;
  }

  if (body.test && orKey) {
    const { systemPrompt } = await buildSystemPrompt({ projectId: null });
    const client = new OpenAI({
      apiKey: orKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const configured =
      typeof report.chatMainModel === "string" ? report.chatMainModel : "";
    const candidates = (body.models ?? [configured, "google/gemini-2.5-flash"]).filter(
      (m, i, a) => m.includes("/") && !m.startsWith("anthropic/") && a.indexOf(m) === i,
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

  if (body.test_gemini) {
    const gKey = await getOperatorSecret("GEMINI_API_KEY", {
      auditUserId: "operator_luis",
    });
    if (!gKey) {
      report.test_gemini = { error: "sin GEMINI_API_KEY" };
    } else {
      try {
        const { systemPrompt } = await buildSystemPrompt({ projectId: null });
        const g = new OpenAI({
          apiKey: gKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        });
        const c = await g.chat.completions.create({
          model: body.gemini_model ?? "gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: body.message ?? "Hola V, prueba de vida." },
          ],
        });
        report.test_gemini = {
          ok: true,
          model: body.gemini_model ?? "gemini-2.5-flash",
          text: c.choices?.[0]?.message?.content ?? "",
        };
      } catch (e) {
        const err = e as { status?: number; message?: string };
        report.test_gemini = {
          status: err?.status ?? null,
          error: String(err?.message ?? e).slice(0, 300),
        };
      }
    }
  }

  return Response.json(report);
}
