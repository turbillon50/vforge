import { NextRequest, NextResponse } from "next/server";
import { voiceBrain, textBrain, type ChatTurn } from "@/lib/forge/v-brain";
import { persistVTurn, getVMessages } from "@/lib/v-chat/store";
import { matchPlugins } from "@/lib/v/plugins/registry";
import { runMatchedPlugins } from "@/lib/v/plugins/runner";
import { ensureDatabaseHealed } from "@/lib/db/client";

export const runtime = "nodejs";

// Historial máximo: voz corto (4 turnos), texto largo (20 turnos)
const MAX_HISTORY_VOICE = 4;
const MAX_HISTORY_TEXT = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, session_id, mode } = body;

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const safeHistory: ChatTurn[] = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_TEXT * 2)
      : [];

    const persistable =
      typeof session_id === "string" &&
      session_id.length > 0 &&
      session_id !== "default" &&
      session_id !== "voice";

    // ─── MODO VOZ ─────────────────────────────────────────────────────────────
    if (mode === "voice") {
      const voiceHistory = safeHistory.slice(-MAX_HISTORY_VOICE * 2);
      const reply = await voiceBrain(message, voiceHistory);
      if (persistable && reply.trim()) {
        await persistVTurn({
          sessionId: session_id,
          userText: message,
          assistantText: reply,
          model: "v-hetzner-voice",
        }).catch(() => {});
      }
      return NextResponse.json({
        ok: true,
        reply,
        mode: "voice",
        session_id: session_id || "voice",
      });
    }

    // ─── PLUGINS ──────────────────────────────────────────────────────────────
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
      console.error("[V plugins] dispatch failed:", e);
    }

    // ─── MODO TEXTO — cerebro V via Hetzner (cuenta de usuario de Luis) ───────
    // Rehidratar historial desde DB si no vino del cliente
    let contextHistory: ChatTurn[] = safeHistory;
    if (persistable && safeHistory.length === 0) {
      try {
        const dbMsgs = await getVMessages(session_id);
        contextHistory = dbMsgs.slice(-MAX_HISTORY_TEXT * 2).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      } catch {
        // best-effort
      }
    }

    const reply = await textBrain(message, contextHistory);

    if (persistable && reply.trim()) {
      await persistVTurn({
        sessionId: session_id,
        userText: message,
        assistantText: reply,
        model: "v-hetzner-text",
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      reply,
      mode: "text",
      model: "claude-via-hetzner",
      session_id: session_id || "default",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[V chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
