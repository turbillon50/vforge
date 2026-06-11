import { NextRequest } from "next/server";
import { twiml, verifyTwilioSignature } from "@/lib/forge/twilio-voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FASE 2 — Webhook de inicio de llamada a V (Twilio Voice).
 * Apuntar el número TWILIO_PHONE aquí: https://vforge.site/api/v/voice/twilio
 * V saluda y abre micrófono (Gather speech) que postea a /process.
 */
export async function POST(req: NextRequest) {
  const ok = await verifyTwilioSignature(req);
  if (!ok) return new Response("forbidden", { status: 403 });

  return twiml(
    `<Say language="es-MX" voice="Google.es-US-Neural2-A">Ey, hermano. Soy V. ¿Qué traemos hoy?</Say>` +
      `<Gather input="speech" action="/api/v/voice/twilio/process" method="POST" language="es-MX" speechTimeout="auto" timeout="8" />` +
      `<Say language="es-MX">No te escuché. Márcame cuando quieras.</Say>`,
  );
}

// Twilio puede sondear con GET al configurar el número.
export async function GET() {
  return twiml(
    `<Say language="es-MX">Hola, soy V. Llámame para platicar.</Say>`,
  );
}
