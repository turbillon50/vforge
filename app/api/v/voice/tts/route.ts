import { NextRequest, NextResponse } from "next/server";

// Node runtime: necesitamos streamear binario de ElevenLabs sin tocar la key en cliente.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "krBsgMV3f0K6YAouOTs9";
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";

/**
 * POST /api/v/voice/tts
 * body: { text: string, voiceId?: string }
 * → stream de audio MP3 (la voz de V). La key NUNCA sale al cliente.
 */
export async function POST(req: NextRequest) {
  if (!EL_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY no configurada" }, { status: 500 });
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "text requerido" }, { status: 400 });
  }
  // Tope defensivo: no mandamos novelas a TTS.
  const safeText = text.slice(0, 2500);
  const voiceId = body.voiceId || VOICE_ID;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": EL_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: safeText,
        model_id: TTS_MODEL,
        // Voz cálida y con chispa, sin perder claridad (vibe hermana genio).
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `ElevenLabs TTS falló: ${upstream.status} ${err.slice(0, 300)}` },
      { status: 502 },
    );
  }

  // Reenviamos el stream tal cual: el <audio> empieza a sonar mientras llega.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
