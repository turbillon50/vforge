import { NextRequest } from "next/server";
import { twiml, sayEscape, verifyTwilioSignature } from "@/lib/forge/twilio-voice";
import { voiceBrain, type ChatTurn } from "@/lib/forge/v-voice-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Historia por llamada (CallSid). Suficiente para el gancho; se pierde entre
// instancias serverless — para producción dura migrar a KV/Neon.
const callHistory = new Map<string, ChatTurn[]>();

/**
 * FASE 2 — Turno de conversación telefónica con V.
 * Twilio nos manda SpeechResult (su STT) → cerebro Gemini de V → <Say es-MX>.
 * Vuelve a abrir <Gather> para conversación continua.
 */
export async function POST(req: NextRequest) {
  const ok = await verifyTwilioSignature(req);
  if (!ok) return new Response("forbidden", { status: 403 });

  const form = await req.formData();
  const speech = String(form.get("SpeechResult") || "").trim();
  const callSid = String(form.get("CallSid") || "anon");

  if (!speech) {
    return twiml(
      `<Say language="es-MX">No te entendí, hermano. ¿Me repites?</Say>` +
        `<Gather input="speech" action="/api/v/voice/twilio/process" method="POST" language="es-MX" speechTimeout="auto" timeout="8" />`,
    );
  }

  const history = callHistory.get(callSid) || [];
  let reply: string;
  try {
    reply = await voiceBrain(speech, history);
  } catch {
    reply = "Uy, se me trabó algo aquí. Inténtalo otra vez, hermano.";
  }
  history.push({ role: "user", content: speech });
  history.push({ role: "assistant", content: reply });
  callHistory.set(callSid, history.slice(-12));

  return twiml(
    `<Say language="es-MX" voice="Google.es-US-Neural2-A">${sayEscape(reply)}</Say>` +
      `<Gather input="speech" action="/api/v/voice/twilio/process" method="POST" language="es-MX" speechTimeout="auto" timeout="8">` +
      `<Say language="es-MX">¿Algo más?</Say>` +
      `</Gather>` +
      `<Say language="es-MX">Va, hermano. Aquí ando cuando me necesites.</Say>`,
  );
}
