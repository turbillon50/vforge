import OpenAI from "openai";
import { sql } from "@/lib/db/client";
import { normalizeSlug } from "@/lib/forge/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vision → brief técnico. Recibe una imagen (screenshot de app/diseño),
// la manda a Claude Sonnet con visión, y devuelve un brief listo para que V
// arranque la construcción. Vision + generación pueden tardar; 300 = mismo
// techo que /run para no morir antes de responder.
export const maxDuration = 300;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPERATOR_USER_ID = "operator_luis";

// claude-sonnet-4-6 (pedido) → slug OpenRouter canónico via normalizeSlug.
const VISION_MODEL = normalizeSlug("claude-sonnet-4-6");

const VISION_PROMPT = `Eres V, el arquitecto técnico de V·Momentum. Analiza esta imagen de una app/diseño y produce un BRIEF TÉCNICO accionable para reconstruirla con Next.js + Tailwind.

Extrae y estructura EN ESPAÑOL:

## Paleta de colores
Hex exactos (fondo, surface, texto, acentos primario/secundario). Si es dark, dilo.

## Componentes UI
Lista cada componente visible (header, nav, cards, hero, botones, inputs, tablas, modales…) con su layout y jerarquía.

## Flujo de usuario
Qué hace la pantalla, navegación implícita, estados, interacciones.

## Stack tecnológico probable
Framework, librerías de UI, fuentes, tipo de app (landing, dashboard, PWA…).

## Plan de construcción Next.js + Tailwind
Estructura de archivos/rutas, componentes a crear, tokens de tema, y orden de implementación. Directo, sin relleno — esto lo ejecuta otro agente.`;

interface VisionRequest {
  /** base64 sin el prefijo data:...;base64, */
  imageBase64: string;
  /** mime-type, ej. image/png */
  mediaType?: string;
  /** contexto opcional del usuario sobre qué quiere construir */
  note?: string;
  projectId?: string | null;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let body: VisionRequest;
  try {
    body = (await req.json()) as VisionRequest;
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  // Acepta tanto el base64 crudo como un data URL completo.
  let imageBase64 = (body.imageBase64 || "").trim();
  let mediaType = body.mediaType || "image/png";
  const dataUrlMatch = /^data:([^;]+);base64,([\s\S]+)$/.exec(imageBase64);
  if (dataUrlMatch) {
    mediaType = dataUrlMatch[1];
    imageBase64 = dataUrlMatch[2];
  }
  if (!imageBase64) {
    return jsonError("imageBase64 (string) required", 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError("ANTHROPIC_API_KEY not configured", 500);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": "https://vforge.site",
      "X-Title": "VForge Vision",
    },
  });

  const userNote = (body.note || "").trim();
  let brief: string;
  try {
    const completion = await client.chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 2200,
      messages: [
        { role: "system", content: VISION_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: userNote
                ? `Contexto de Luis: ${userNote}\n\nGenera el brief técnico.`
                : "Genera el brief técnico de esta imagen.",
            },
          ],
        },
      ],
    });
    brief = completion.choices[0]?.message?.content?.trim() || "";
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return jsonError(`vision model failed: ${detail}`, 502);
  }

  if (!brief) {
    return jsonError("vision model returned empty brief", 502);
  }

  // Guarda el brief en la base de conocimiento de VForge (kind='vision_brief')
  // para que V lo tenga como referencia persistente. Best-effort: si la DB
  // falla, igual devolvemos el brief al cliente.
  let savedId: string | null = null;
  try {
    const titleSeed =
      userNote.slice(0, 80) ||
      brief.replace(/[#*`]/g, "").split("\n").find((l) => l.trim())?.slice(0, 80) ||
      "diseño analizado";
    const inserted = (await sql`
      INSERT INTO knowledge_base (kind, title, content, tags, source, created_by)
      VALUES (
        'vision_brief',
        ${`Vision brief: ${titleSeed}`},
        ${brief},
        ${["vision", "vision_brief", "build"] as unknown as string[]},
        ${"forge/vision"},
        ${OPERATOR_USER_ID}
      )
      RETURNING id
    `) as Array<{ id: string }>;
    savedId = inserted[0]?.id ?? null;
  } catch (e) {
    console.error("[vision] knowledge_base insert failed:", e);
  }

  return new Response(
    JSON.stringify({ ok: true, brief, savedId, model: VISION_MODEL }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
