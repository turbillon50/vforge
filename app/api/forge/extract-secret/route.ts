import OpenAI from "openai";
import { sql } from "@/lib/db/client";
import { requireOperatorSecret } from "@/lib/vault/get-secret";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB cap on the screenshot

interface ExtractedSecret {
  name: string | null; // tentative — might be null if not detected
  value: string | null; // the secret string
  provider: string | null;
  description: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

/**
 * POST /api/forge/extract-secret
 * Body: multipart/form-data with field "image" (Blob, jpeg/png/webp).
 *
 * Sends the screenshot to OpenAI Vision (gpt-4o) with a structured
 * extraction prompt. Returns a parsed JSON of the candidate secret
 * for the /vault "Add" form to pre-populate.
 *
 * Anillo 1 — sensitive but auto-allowed for the operator. Audit-logged.
 *
 * Cost: gpt-4o vision call ~$0.01-0.03 per screenshot.
 */
export async function POST(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Body must be multipart/form-data", 400);
  }

  const image = form.get("image");
  if (!(image instanceof Blob)) {
    return jsonError("'image' field is required and must be a Blob", 400);
  }
  if (image.size === 0) {
    return jsonError("image is empty", 400);
  }
  if (image.size > MAX_BYTES) {
    return jsonError(
      `image too large (${(image.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_BYTES / 1024 / 1024} MB.`,
      413,
    );
  }

  const apiKey = await requireOperatorSecret("OPENAI_API_KEY", {
    auditUserId: auth.userId,
  }).catch(() => null);
  if (!apiKey) {
    return jsonError("OPENAI_API_KEY not in vault", 500);
  }

  // Convert blob to base64 data URL for OpenAI
  const buffer = Buffer.from(await image.arrayBuffer());
  const mime = image.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  const openai = new OpenAI({ apiKey });

  const prompt = `Estás analizando una captura de pantalla que el operador subió a vForge para extraer una API key o secret y guardarlo en su vault cifrado.

Tu tarea: identifica EL VALOR EXACTO del secret/key/token visible en la imagen y los metadatos que lo acompañan.

Responde SOLO con un JSON válido con este shape exacto, sin texto extra ni markdown:

{
  "name": "UPPER_SNAKE_CASE_KEY_NAME or null si no se ve",
  "value": "el-string-exacto-del-secret o null si no es legible",
  "provider": "anthropic | openai | google-gemini | perplexity | clerk | neon | vercel | name.com | github | stripe | mercadopago | conekta | facturapi | resend | twilio | cloudflare | aws | otro",
  "description": "1 oración describiendo qué es esta key, basado en lo que se ve en la imagen",
  "confidence": "high | medium | low",
  "notes": "cualquier ambigüedad, valor parcialmente cortado, key potencialmente comprometida visible en pantalla, etc., o null"
}

Reglas:
- El campo "value" debe ser EL VALOR LITERAL del secret (ej. "sk-ant-api03-..."). Copia caracter por caracter, NO lo parafrasees.
- Si la captura solo muestra parte del valor (truncado/oculto), pon value=null y notes="visible parcialmente: ..."
- Si hay multiples valores en la imagen, elige el que parece más obviamente el secret/key (típicamente el más largo y aleatorio).
- "provider" se infiere del prefijo (sk-ant-=anthropic, sk-proj-=openai, AIza=google-gemini, pplx-=perplexity, sk_live_/pk_live_=clerk, ghp_=github, etc.) y/o del contexto visual (logo del proveedor, dashboard, etc.).
- Si no estás seguro de algo, pon ese campo en null y explica en "notes".
`;

  let extracted: ExtractedSecret;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 800,
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const text = completion.choices[0]?.message?.content ?? "{}";
    extracted = JSON.parse(text) as ExtractedSecret;
  } catch (err) {
    return jsonError(
      `vision error: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  // Audit (no image bytes saved — only metadata)
  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (
      ${auth.userId}, 'forge.extract_secret', 'secret', 1,
      ${JSON.stringify({
        bytes: image.size,
        mime,
        confidence: extracted.confidence,
        provider: extracted.provider,
        name_detected: extracted.name,
      })}::jsonb
    )
  `;

  return new Response(JSON.stringify({ extracted }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
