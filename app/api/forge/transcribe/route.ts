import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";
const MAX_BYTES = 25 * 1024 * 1024;
const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v1";

/**
 * POST /api/forge/transcribe
 * Body: multipart/form-data con campo "audio" (Blob) y opcional "language".
 * Transcribe con ElevenLabs Scribe (antes Whisper/OpenAI, migrado por cuota 429).
 * Devuelve { text }. Audio efímero: nunca se persiste; solo metadata en audit_events.
 */
export async function POST(req: Request) {
  if (!EL_KEY) {
    return jsonError("ELEVENLABS_API_KEY not configured", 500);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Body must be multipart/form-data", 400);
  }

  const audio = form.get("audio");
  const language = (form.get("language") as string | null) ?? "es";

  if (!(audio instanceof Blob)) {
    return jsonError("'audio' field is required and must be a Blob", 400);
  }
  if (audio.size === 0) {
    return jsonError("audio is empty", 400);
  }
  if (audio.size > MAX_BYTES) {
    return jsonError(
      `audio too large (${(audio.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_BYTES / 1024 / 1024} MB.`,
      413,
    );
  }

  const mime = audio.type || "audio/webm";
  const ext = mimeToExt(mime);

  const elForm = new FormData();
  elForm.append("model_id", STT_MODEL);
  elForm.append("language_code", toScribeLang(language));
  elForm.append("file", audio, `voice.${ext}`);

  try {
    const upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": EL_KEY },
      body: elForm,
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      return jsonError(`Scribe error: ${upstream.status} ${raw.slice(0, 200)}`, 502);
    }

    let data: { text?: string };
    try {
      data = JSON.parse(raw);
    } catch {
      return jsonError("STT response not parseable", 502);
    }

    const text = (data.text || "").trim();

    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
      VALUES (
        ${OPERATOR_USER_ID}, 'forge.transcribe', 'audio', 0,
        ${JSON.stringify({
          bytes: audio.size,
          mime,
          language,
          engine: "elevenlabs_scribe",
          text_chars: text.length,
        })}::jsonb
      )
    `;

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`Scribe error: ${message}`, 502);
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toScribeLang(lang: string): string {
  const l = lang.toLowerCase();
  if (l.startsWith("es")) return "spa";
  if (l.startsWith("en")) return "eng";
  return "spa";
}

function mimeToExt(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

