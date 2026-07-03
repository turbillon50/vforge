import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";
const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
// Voz fija de V — consistente en todas las conversaciones.
// Override por env V_VOICE_ID. Default "Sarah" (krBsgMV3f0K6YAouOTs9).
const VOICE_ID = process.env.V_VOICE_ID || "krBsgMV3f0K6YAouOTs9";
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";
// ElevenLabs cobra por carácter; cortamos para no quemar cuota con respuestas largas.
const MAX_CHARS = 2500;

/**
 * POST /api/forge/tts
 * Body: { text: string }
 * Sintetiza la voz de V con ElevenLabs (eleven_multilingual_v2, español).
 * Devuelve { audio: "<base64 mp3>", mime, voiceId } para reproducir en el cliente.
 * Audio efímero: nunca se persiste; solo metadata en audit_events.
 */
export async function POST(req: Request) {
  if (!EL_KEY) {
    return jsonError("ELEVENLABS_API_KEY not configured", 500);
  }

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Body must be JSON { text }", 400);
  }

  const raw = typeof body.text === "string" ? body.text : "";
  // Limpiamos markdown/emoji ruidoso para que la voz no lea asteriscos ni backticks.
  const text = sanitizeForSpeech(raw).slice(0, MAX_CHARS);

  if (!text) {
    return jsonError("'text' is required and must be non-empty", 400);
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": EL_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      },
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      return jsonError(`ElevenLabs TTS error: ${upstream.status} ${errText.slice(0, 200)}`, 502);
    }

    const buf = await upstream.arrayBuffer();
    const audio = Buffer.from(buf).toString("base64");

    try {
      await sql`
        INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
        VALUES (
          ${OPERATOR_USER_ID}, 'forge.tts', 'audio', 0,
          ${JSON.stringify({
            chars: text.length,
            bytes: buf.byteLength,
            engine: "elevenlabs",
            voice_id: VOICE_ID,
            model: TTS_MODEL,
          })}::jsonb
        )
      `;
    } catch {
      // El audit no debe tumbar la respuesta de voz.
    }

    return new Response(JSON.stringify({ audio, mime: "audio/mpeg", voiceId: VOICE_ID }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`ElevenLabs TTS error: ${message}`, 502);
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Quita markdown, code fences, links y emoji para que la voz suene natural. */
function sanitizeForSpeech(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " (bloque de código) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>~|]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
