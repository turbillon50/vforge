import OpenAI from "openai";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — OpenAI limit

/**
 * POST /api/forge/transcribe
 * Body: multipart/form-data with field "audio" (Blob) and optional
 *       "language" (BCP-47 tag, default "es").
 *
 * Returns { text } with the Whisper transcription. Costs ~$0.006/min.
 *
 * Audio is ephemeral: never persisted to disk or DB. We only log the
 * resulting text length and duration in audit_events.
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError("OPENAI_API_KEY not configured", 500);
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

  const openai = new OpenAI({ apiKey });

  // Determine filename from MIME type so OpenAI's multipart upload
  // names the part with a recognizable extension.
  const mime = audio.type || "audio/webm";
  const ext = mimeToExt(mime);
  const file = new File([audio], `voice.${ext}`, { type: mime });

  try {
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
      response_format: "json",
    });

    const text = transcript.text?.trim() ?? "";

    // Audit event (no audio bytes saved — just metadata)
    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
      VALUES (
        ${OPERATOR_USER_ID}, 'forge.transcribe', 'audio', 0,
        ${JSON.stringify({
          bytes: audio.size,
          mime,
          language,
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
    return jsonError(`Whisper error: ${message}`, 502);
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mimeToExt(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}
