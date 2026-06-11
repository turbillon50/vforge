// E2E REAL del pipeline de voz de V — cero mock.
// Replica EXACTAMENTE lo que hacen las rutas /api/v/voice/stt, /api/v/chat (mode voice)
// y /api/v/voice/tts, usando los mismos parámetros y servicios reales.
// Flujo por turno: [voz de Luis → STT real] → [cerebro Gemini real] → [TTS real de V].
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const EVID = "/tmp/vvoz_evidence";
mkdirSync(EVID, { recursive: true });

function envFrom(path, key) {
  const line = readFileSync(path, "utf8").split("\n").find((l) => l.startsWith(key + "="));
  return line ? line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim() : "";
}
const EL = envFrom("/root/.env", "ELEVENLABS_API_KEY");
const GE = envFrom("/root/.env", "GEMINI_API_KEY");
const VOICE_ID = "ewn5JTa3lNPY8QVuZJi6"; // Ana Sofía — mexican young (voz de V)
const LUIS_VOICE = "tMzxR2W7o3RLIY7zWBbG"; // Dani — mexican young (simula a Luis hablando)
const TTS_MODEL = "eleven_flash_v2_5";
const STT_MODEL = "scribe_v1";
const V_VOICE_MODEL = "gemini-2.5-flash";

const V_VOICE_SYSTEM_PROMPT = readFileSync(
  "/root/vforge/lib/forge/v-voice-persona.ts", "utf8")
  .match(/V_VOICE_SYSTEM_PROMPT = `([\s\S]*?)`;/)[1];

// ── TTS real (igual que /api/v/voice/tts) ──
async function tts(text, voiceId, outFile) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": EL, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      model_id: TTS_MODEL,
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error("TTS " + r.status + " " + (await r.text()).slice(0, 200));
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(outFile, buf);
  return buf;
}

// ── STT real (igual que /api/v/voice/stt) ──
async function stt(buf) {
  const fd = new FormData();
  fd.append("model_id", STT_MODEL);
  fd.append("language_code", "spa");
  fd.append("file", new Blob([buf], { type: "audio/mpeg" }), "clip.mp3");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST", headers: { "xi-api-key": EL }, body: fd,
  });
  if (!r.ok) throw new Error("STT " + r.status + " " + (await r.text()).slice(0, 200));
  return (await r.json()).text.trim();
}

// ── Cerebro hablado real (igual que /api/v/chat mode:voice) ──
async function brain(message, history) {
  const contents = [
    ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: message }] },
  ];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${V_VOICE_MODEL}:generateContent?key=${GE}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: V_VOICE_SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: 220, temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!r.ok) throw new Error("Gemini " + r.status + " " + (await r.text()).slice(0, 200));
  const d = await r.json();
  return d.candidates[0].content.parts.map((p) => p.text || "").join("").trim();
}

const LUIS_TURNS = [
  "Oye, cuéntame rápido cómo vamos con el proyecto de voz.",
  "Perfecto. Y si te llamo por teléfono, ¿también me vas a contestar?",
  "Va. Una última, ¿en qué servidor estás corriendo?",
];

const history = [];
const log = [];
log.push("════════ CONVERSACIÓN DE VOZ REAL — V VOZ (E2E, cero mock) ════════\n");
const t0 = Date.now();

for (let i = 0; i < LUIS_TURNS.length; i++) {
  const intended = LUIS_TURNS[i];
  // 1) Luis "habla" → audio real
  const luisAudio = await tts(intended, LUIS_VOICE, `${EVID}/turn${i + 1}_luis.mp3`);
  // 2) STT real → texto
  const sttText = await stt(luisAudio);
  // 3) Cerebro real
  const tb = Date.now();
  const reply = await brain(sttText, history);
  const brainMs = Date.now() - tb;
  // 4) TTS real de V → audio
  await tts(reply, VOICE_ID, `${EVID}/turn${i + 1}_v.mp3`);

  history.push({ role: "user", content: sttText });
  history.push({ role: "assistant", content: reply });

  log.push(`── TURNO ${i + 1} ──`);
  log.push(`🎙️  Luis dijo (intención):  "${intended}"`);
  log.push(`👂  STT transcribió:        "${sttText}"`);
  log.push(`🧠  V respondió (${brainMs}ms):    "${reply}"`);
  log.push(`🔊  Audio V:                ${EVID}/turn${i + 1}_v.mp3\n`);
}

log.push(`Total: ${LUIS_TURNS.length} turnos en ${((Date.now() - t0) / 1000).toFixed(1)}s. Audios en ${EVID}/`);
const out = log.join("\n");
console.log(out);
writeFileSync(`${EVID}/transcript.txt`, out);
