import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v1";

/**
 * POST /api/v/voice/stt
 * multipart/form-data con campo "file" (audio del micrófono, webm/ogg/mp4).
 * → { text, language } transcrito por ElevenLabs Scribe. Key server-side.
 */
export async function POST(req: NextRequest) {
  if (!EL_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY no configurada" }, { status: 500 });
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }

  const file = inForm.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "campo 'file' (audio) requerido" }, { status: 400 });
  }

  // Reempaquetamos para ElevenLabs Scribe.
  const elForm = new FormData();
  elForm.append("model_id", STT_MODEL);
  elForm.append("language_code", "spa"); // pista: hablamos español
  const filename = (file as File).name || "audio.webm";
  elForm.append("file", file, filename);

  const upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": EL_KEY },
    body: elForm,
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `ElevenLabs STT falló: ${upstream.status} ${raw.slice(0, 300)}` },
      { status: 502 },
    );
  }

  let data: { text?: string; language_code?: string };
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Respuesta STT no parseable" }, { status: 502 });
  }

  return NextResponse.json({
    text: (data.text || "").trim(),
    language: data.language_code || "spa",
  });
}
