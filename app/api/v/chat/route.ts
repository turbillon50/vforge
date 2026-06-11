import { NextRequest, NextResponse } from "next/server";

const HETZNER_V_URL = "http://178.105.135.26/v/chat";
const HETZNER_SECRET = process.env.HETZNER_SECRET || "";

// qwen2.5:1.5b colapsa con contexto largo — máximo 6 turnos (12 mensajes)
const MAX_HISTORY_TURNS = 6;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, session_id } = body;

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // Truncar historial para no colapsar el modelo pequeño
    const safeHistory = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_TURNS * 2)
      : [];

    const upstream = await fetch(HETZNER_V_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: HETZNER_SECRET,
        message,
        history: safeHistory,
        session_id: session_id || "default",
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return NextResponse.json({ error: err }, { status: upstream.status });
    }

    const data = await upstream.json();

    // Sanitizar respuesta corrupta del modelo antes de enviar al cliente
    if (data.reply && typeof data.reply === "string") {
      const r = data.reply;
      if (/(.)\1{40,}/.test(r) || /([A-Z]{2,6})\1{20,}/.test(r) || /(?:LLL|nuL|doL){6,}/.test(r)) {
        const match = r.match(/(.)\1{40,}|([A-Z]{2,6})\1{20,}|(?:LLL|nuL|doL){6,}/);
        const idx = match ? r.indexOf(match[0]) : 0;
        data.reply = (idx > 20 ? r.substring(0, idx).trim() : "") +
          "\n\n⚠ _Respuesta truncada — modelo con contexto excesivo._";
      }
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
