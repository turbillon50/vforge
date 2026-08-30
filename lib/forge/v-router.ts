import "server-only";

import OpenAI from "openai";
import { modelForEngine, resolveLlmEngine } from "@/lib/forge/llm-engine";
import { textBrain, type ChatTurn } from "@/lib/forge/v-brain";

export type VMode = "talk" | "plan";

export class ProviderUnavailable extends Error {
  provider: string;
  causeText: string;

  constructor(provider: string, causeText: string) {
    super(`${provider} unavailable`);
    this.name = "ProviderUnavailable";
    this.provider = provider;
    this.causeText = causeText;
  }
}

export interface AskVResult {
  text: string;
  provider: string;
  model: string;
  status: "ok" | "fallback";
  durationMs: number;
  systemNotice?: string;
}

const PROVIDER_FAILURE = [
  /weekly limit/i,
  /usage limit/i,
  /rate limit/i,
  /c[oó]digo\s*1/i,
  /code\s*1/i,
  /command failed/i,
  /provider unavailable/i,
  /timed?\s*out/i,
  /timeout/i,
  /termin[oó]\s+con\s+(?:c[oó]digo|code|estado)\s*1/i,
  /termin[oó]\s+con\s+estado\s+failed/i,
];

function providerFailure(text: string): boolean {
  const trimmed = text.trim();
  return !trimmed || PROVIDER_FAILURE.some((pattern) => pattern.test(trimmed));
}

function modeInstruction(mode: VMode): string {
  return mode === "plan"
    ? "MODO PLANEACIÓN. Entrega alcance, pasos, riesgos y criterios de aceptación. No escribas código, no crees ramas, no llames dispatch ni agentes y nunca afirmes que ejecutaste cambios."
    : "MODO PLÁTICA. Conversa naturalmente, pregunta cuando falte contexto y ayuda a pensar. No crees ramas, no llames dispatch ni agentes y nunca afirmes que modificaste código.";
}

function buildMessages(args: {
  mode: VMode;
  projectId: string;
  repository?: string | null;
  message: string;
  history: ChatTurn[];
}) {
  return [
    {
      role: "system" as const,
      content: [
        "Eres V dentro de VForge.",
        modeInstruction(args.mode),
        `Proyecto: ${args.projectId}.`,
        `Repositorio de contexto: ${args.repository || "sin repositorio seleccionado"}.`,
        "Responde en español claro y directo.",
      ].join("\n"),
    },
    ...args.history.slice(-20).map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user" as const, content: args.message },
  ];
}

async function callPrimary(args: {
  mode: VMode;
  projectId: string;
  repository?: string | null;
  message: string;
  history: ChatTurn[];
  preferredModel?: string;
}): Promise<{ text: string; provider: string; model: string }> {
  const engine = resolveLlmEngine();
  if (!engine.client || engine.name === "none") {
    throw new ProviderUnavailable("mesh", "No primary LLM engine configured");
  }

  const model = modelForEngine(
    engine,
    args.preferredModel?.trim() || engine.defaultChatModel,
  );
  try {
    const completion = await engine.client.chat.completions.create({
      model,
      messages: buildMessages(args),
      temperature: args.mode === "plan" ? 0.2 : 0.5,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    if (providerFailure(text)) {
      throw new ProviderUnavailable(engine.name, text || "empty response");
    }
    return { text, provider: engine.name, model: completion.model || model };
  } catch (caught) {
    if (caught instanceof ProviderUnavailable) throw caught;
    const detail = caught instanceof Error ? caught.message : String(caught);
    throw new ProviderUnavailable(engine.name, detail);
  }
}

async function callOpenRouterFallback(args: {
  mode: VMode;
  projectId: string;
  repository?: string | null;
  message: string;
  history: ChatTurn[];
}): Promise<{ text: string; provider: string; model: string }> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new ProviderUnavailable("openrouter", "not configured");
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://vforge.site",
      "X-Title": "vForge",
    },
  });
  const model = process.env.MODEL_CHAT_MAIN?.trim() || "openai/gpt-oss-120b";
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: buildMessages(args),
      temperature: args.mode === "plan" ? 0.2 : 0.5,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    if (providerFailure(text)) {
      throw new ProviderUnavailable("openrouter", text || "empty response");
    }
    return { text, provider: "openrouter", model: completion.model || model };
  } catch (caught) {
    if (caught instanceof ProviderUnavailable) throw caught;
    const detail = caught instanceof Error ? caught.message : String(caught);
    throw new ProviderUnavailable("openrouter", detail);
  }
}

export async function askV(args: {
  mode: VMode;
  projectId: string;
  repository?: string | null;
  message: string;
  history?: ChatTurn[];
  preferredModel?: string;
}): Promise<AskVResult> {
  const started = Date.now();
  const history = args.history || [];
  const failures: string[] = [];

  try {
    const primary = await callPrimary({ ...args, history });
    return {
      text: primary.text,
      provider: primary.provider,
      model: primary.model,
      status: "ok",
      durationMs: Date.now() - started,
    };
  } catch (caught) {
    const error = caught instanceof ProviderUnavailable
      ? caught
      : new ProviderUnavailable("primary", String(caught));
    failures.push(error.provider);
  }

  // OpenRouter is only used when our primary engine is unavailable.
  try {
    const fallback = await callOpenRouterFallback({ ...args, history });
    return {
      text: fallback.text,
      provider: fallback.provider,
      model: fallback.model,
      status: "fallback",
      durationMs: Date.now() - started,
      systemNotice: `${failures[0] || "Proveedor principal"} no disponible; continuamos con ${fallback.provider}.`,
    };
  } catch (caught) {
    const error = caught instanceof ProviderUnavailable
      ? caught
      : new ProviderUnavailable("openrouter", String(caught));
    failures.push(error.provider);
  }

  // Claude CLI is last resort, never the only dependency.
  try {
    const prompt = `${modeInstruction(args.mode)}\n\nPROYECTO: ${args.projectId}\nREPOSITORIO: ${args.repository || "sin repositorio"}\n\nMENSAJE:\n${args.message}`;
    const text = (await textBrain(prompt, history)).trim();
    if (providerFailure(text)) {
      throw new ProviderUnavailable("claude-hetzner", text || "empty response");
    }
    return {
      text,
      provider: "claude-hetzner",
      model: "claude-cli",
      status: "fallback",
      durationMs: Date.now() - started,
      systemNotice: `${failures.join(" y ")} no disponibles; continuamos con Claude.`,
    };
  } catch (caught) {
    const error = caught instanceof ProviderUnavailable
      ? caught
      : new ProviderUnavailable("claude-hetzner", String(caught));
    console.error("[V router] providers unavailable", {
      projectId: args.projectId,
      mode: args.mode,
      providers: [...failures, error.provider],
    });
    throw new ProviderUnavailable("all", "No healthy provider available");
  }
}
