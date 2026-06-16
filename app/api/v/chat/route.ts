import { NextRequest, NextResponse } from "next/server";
import { voiceBrain, type ChatTurn } from "@/lib/forge/v-voice-brain";
import { persistVTurn } from "@/lib/v-chat/store";
import { matchPlugins } from "@/lib/v/plugins/registry";
import { runMatchedPlugins } from "@/lib/v/plugins/runner";
import { ensureDatabaseHealed } from "@/lib/db/client";

export const runtime = "nodejs";

const HETZNER_V_URL = process.env.HETZNER_V_URL || "http://178.105.135.26/v/chat";
const HETZNER_SECRET = process.env.HETZNER_SECRET || "";

// qwen2.5:1.5b colapsa con contexto largo — máximo 6 turnos (12 mensajes)
const MAX_HISTORY_TURNS = 6;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, session_id, mode } = body;

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const safeHistory: ChatTurn[] = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_TURNS * 2)
      : [];

    // ¿Persistimos este turno? Sólo con un hilo real (no los placeholders
    // volátiles "default"/"voice"). Best-effort: nunca rompe el chat.
    const persistable =
      typeof session_id === "string" &&
      session_id.length > 0 &&
      session_id !== "default" &&
      session_id !== "voice";

    // ─── MODO VOZ: cerebro hablado Gemini ───────────────────────────────────
    if (mode === "voice") {
      const reply = await voiceBrain(message, safeHistory);
      if (persistable && typeof reply === "string" && reply.trim()) {
        await persistVTurn({
          sessionId: session_id,
          userText: message,
          assistantText: reply,
          model: "v-voice",
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true, reply, mode: "voice", session_id: session_id || "voice" });
    }

    // ─── PLUGINS: ¿el mensaje activa alguna capacidad extendida? ─────────────
    // Antes de molestar al cerebro, vemos si un plugin (registry v_plugins) hace
    // match con el mensaje. Si lo hay, V ejecuta el/los plugin(s) e incorpora su
    // respuesta. Best-effort total: cualquier falla cae al flujo normal.
    try {
      await ensureDatabaseHealed();
      const matches = await matchPlugins(message);
      if (matches.length > 0) {
        const results = await runMatchedPlugins(matches, {
          message,
          sessionId: typeof session_id === "string" ? session_id : undefined,
        });
        const reply = results
          .map(({ result }) => result.reply)
          .filter((r) => r && r.trim())
          .join("\n\n");

        if (reply.trim()) {
          if (persistable) {
            await persistVTurn({
              sessionId: session_id,
              userText: message,
              assistantText: reply,
              model: "v-plugin",
            }).catch(() => {});
          }
          return NextResponse.json({
            ok: true,
            reply,
            mode: "plugin",
            plugins: results.map(({ plugin, result }) => ({
              slug: plugin.slug,
              ok: result.ok,
              data: result.data,
              error: result.error,
            })),
            session_id: session_id || "default",
          });
        }
      }
    } catch (e) {
      // Plugin layer caído → seguimos al cerebro normal, no rompemos el chat.
      console.error("[V plugins] dispatch failed:", e);
    }

    // ─── MODO TEXTO (existente): proxy al cerebro de Hetzner ─────────────────
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
        data.reply =
          (idx > 20 ? r.substring(0, idx).trim() : "") +
          "\n\n⚠ _Respuesta truncada — modelo con contexto excesivo._";
      }
    }

    if (persistable && typeof data.reply === "string" && data.reply.trim()) {
      await persistVTurn({
        sessionId: session_id,
        userText: message,
        assistantText: data.reply,
        model: "v-hetzner",
      }).catch(() => {});
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
