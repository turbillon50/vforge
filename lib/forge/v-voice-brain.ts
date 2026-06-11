import { V_VOICE_SYSTEM_PROMPT } from "@/lib/forge/v-voice-persona";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const V_VOICE_MODEL = process.env.V_VOICE_MODEL || "gemini-2.5-flash";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Cerebro HABLADO de V (Gemini Flash, thinking OFF para latencia mínima).
 * Compartido por el chat in-app (modo voz) y el webhook telefónico de Twilio.
 * La key vive solo en el server.
 */
export async function voiceBrain(message: string, history: ChatTurn[] = []): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");

  const contents = [
    ...history.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${V_VOICE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: V_VOICE_SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.9,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  return text || "Perdón hermano, no te capté. ¿Me lo repites?";
}
