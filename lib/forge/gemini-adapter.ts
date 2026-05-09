/**
 * Gemini adapter — capa fina sobre @google/genai para que el resto del
 * código de forge no sepa de Gemini. Mantiene la misma forma de tools
 * y mensajes que vForge ya usaba con Anthropic, traduciéndolos al
 * formato Gemini al borde.
 *
 * Conversiones:
 *   tools (Anthropic-shape)         → functionDeclarations (Gemini)
 *   message blocks (text|image)     → parts (text|inlineData)
 *   tool_use block (assistant)      → functionCall part
 *   tool_result block (user)        → functionResponse part
 *
 * Streaming:
 *   Gemini emite chunks con .text y .functionCalls; emitimos eventos
 *   compatibles con lo que el frontend ya consume:
 *     { type: "text", value: string }
 *     { type: "tool_use_start", id, name }
 *     { type: "tool_use_result", id, ok, summary }
 *     { type: "done", tokensIn, tokensOut, model }
 */
import { GoogleGenAI, type Content, type Part } from "@google/genai";

// ─── Tipos compartidos (formato neutral) ────────────────────────────────────

export interface NeutralTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type StructuredBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string | StructuredBlock[];
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

// ─── Conversión de TOOLS ────────────────────────────────────────────────────

export function toolsToGemini(tools: NeutralTool[]): Array<{
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}> {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.input_schema as Record<string, unknown>,
      })),
    },
  ];
}

// ─── Conversión de mensajes ─────────────────────────────────────────────────

/** Convierte un ChatTurn (user/assistant + blocks) a Content de Gemini. */
function turnToContent(turn: ChatTurn): Content {
  // Gemini usa "model" en lugar de "assistant"
  const role = turn.role === "assistant" ? "model" : "user";
  const parts: Part[] = [];

  if (typeof turn.content === "string") {
    parts.push({ text: turn.content });
  } else {
    for (const block of turn.content) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      } else if (block.type === "image") {
        parts.push({
          inlineData: {
            mimeType: block.source.media_type,
            data: block.source.data,
          },
        });
      }
    }
  }

  return { role, parts };
}

export function turnsToContents(turns: ChatTurn[]): Content[] {
  return turns.map(turnToContent);
}

/** Append assistant turn que contenía tool_use blocks (functionCalls). */
export function pushAssistantToolCalls(
  contents: Content[],
  textBuffer: string,
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>,
): void {
  const parts: Part[] = [];
  if (textBuffer) parts.push({ text: textBuffer });
  for (const tc of toolCalls) {
    parts.push({
      functionCall: {
        id: tc.id,
        name: tc.name,
        args: tc.args,
      },
    });
  }
  contents.push({ role: "model", parts });
}

/** Append user turn con functionResponses (tool_results). */
export function pushToolResults(
  contents: Content[],
  results: Array<{ id: string; name: string; content: string; is_error: boolean }>,
): void {
  const parts: Part[] = results.map((r) => ({
    functionResponse: {
      id: r.id,
      name: r.name,
      response: r.is_error
        ? { error: r.content }
        : { result: r.content },
    },
  }));
  contents.push({ role: "user", parts });
}

// ─── Cliente streaming ─────────────────────────────────────────────────────

export interface StreamRoundResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  finishReason: string | null;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Una "ronda" del agente: stream una llamada a Gemini, emite eventos vía
 * `send`, y devuelve text+toolCalls para que el caller decida qué hacer.
 */
export async function streamRound(args: {
  ai: GoogleGenAI;
  model: string;
  systemInstruction: string;
  contents: Content[];
  tools: NeutralTool[];
  send: (event: Record<string, unknown>) => void;
}): Promise<StreamRoundResult> {
  const stream = await args.ai.models.generateContentStream({
    model: args.model,
    contents: args.contents,
    config: {
      systemInstruction: args.systemInstruction,
      tools: toolsToGemini(args.tools),
      maxOutputTokens: 2048,
    },
  });

  let text = "";
  const toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }> = [];
  const seenCallIds = new Set<string>();
  let finishReason: string | null = null;
  let tokensIn = 0;
  let tokensOut = 0;

  for await (const chunk of stream) {
    // Texto
    const chunkText = chunk.text;
    if (chunkText) {
      text += chunkText;
      args.send({ type: "text", value: chunkText });
    }

    // Function calls (Gemini puede mandar varios en un chunk)
    const calls = chunk.functionCalls;
    if (calls && calls.length > 0) {
      for (const c of calls) {
        // Generamos id determinista si Gemini no lo da
        const id = c.id ?? `call_${toolCalls.length}_${Date.now()}`;
        if (seenCallIds.has(id)) continue;
        seenCallIds.add(id);
        toolCalls.push({
          id,
          name: c.name ?? "unknown",
          args: (c.args ?? {}) as Record<string, unknown>,
        });
        args.send({ type: "tool_use_start", id, name: c.name });
      }
    }

    // Usage / finish reason (suelen llegar en el último chunk)
    const usage = chunk.usageMetadata;
    if (usage) {
      tokensIn = usage.promptTokenCount ?? tokensIn;
      tokensOut = usage.candidatesTokenCount ?? tokensOut;
    }
    const finishCandidates = chunk.candidates;
    if (finishCandidates && finishCandidates[0]?.finishReason) {
      finishReason = finishCandidates[0].finishReason;
    }
  }

  return { text, toolCalls, finishReason, tokensIn, tokensOut };
}
