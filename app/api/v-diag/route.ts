/**
 * /api/v-diag — DIAGNOSTICO TEMPORAL del motor de V (chat).
 * Protegido por header x-vdiag. Borrar cuando V este estable.
 */
import OpenAI from "openai";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { getModelForTask, setModelForTask } from "@/lib/forge/agent-config";
import { meshAdapter } from "@/lib/forge/adapters/mesh";

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
        { updatedBy: "operator_luis" },
      );
    } catch (e) {
      report.set_model = { error: String(e) };
    }
  }

  report.chatMainModel = await getModelForTask("chat-main").catch(
    (e) => "ERR:" + String(e),
  );
  const cerebrasKey = await getOperatorSecret("CEREBRAS_API_KEY", {
    auditUserId: "operator_luis",
  }).catch(() => null);
  report.cerebras = {
    configured: Boolean(cerebrasKey),
    baseURL: process.env.CEREBRAS_BASE_URL ? "custom" : "default",
  };
  report.mesh = await meshAdapter.health({
    vault: {
      async getOperatorSecret(name) {
        return getOperatorSecret(name, { auditUserId: "operator_luis" });
      },
      async getProjectSecret(projectId, name) {
        return getOperatorSecret(name, {
          auditUserId: "operator_luis",
          projectId,
        });
      },
    },
  }).catch((e) => ({ status: "error", message: String(e) }));

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

  if (body.test) {
    const { systemPrompt } = await buildSystemPrompt({ projectId: null });
    try {
      const c = await meshAdapter.execute({
        policy: "auto",
        maxTokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.message ?? "Hola V, prueba de vida." },
        ],
      }, {
        userId: "operator_luis",
        sessionId: "v-diag",
        signal: req.signal,
        vault: {
          async getOperatorSecret(name) {
            return getOperatorSecret(name, { auditUserId: "operator_luis" });
          },
          async getProjectSecret(projectId, name) {
            return getOperatorSecret(name, {
              auditUserId: "operator_luis",
              projectId,
            });
          },
        },
      });
      report.test = {
        ok: true,
        provider: "mesh",
        layer: c.layer,
        text: c.content,
      };
    } catch (e) {
      report.test = { ok: false, error: String(e).slice(0, 300) };
    }
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
