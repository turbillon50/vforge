import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { voiceBrain, type ChatTurn } from "@/lib/forge/v-voice-brain";
import { V_TEXT_SYSTEM_PROMPT } from "@/lib/forge/v-text-persona";
import { persistVTurn, getVMessages } from "@/lib/v-chat/store";
import { matchPlugins } from "@/lib/v/plugins/registry";
import { runMatchedPlugins } from "@/lib/v/plugins/runner";
import { ensureDatabaseHealed } from "@/lib/db/client";

export const runtime = "nodejs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const V_TEXT_MODEL = process.env.V_TEXT_MODEL || "claude-sonnet-4-6";

// Historial máximo en modo texto (más que en voz — V puede manejar más contexto)
const MAX_HISTORY_TURNS = 20;

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

    // Sesión persistible: cualquier id real que no sea placeholder
    const persistable =
      typeof session_id === "string" &&
      session_id.length > 0 &&
      session_id !== "default" &&
      session_id !== "voice";

    // ─── MODO VOZ: cerebro hablado Gemini ─────────────────────────────────────
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
      return NextResponse.json({
        ok: true,
        reply,
        mode: "voice",
        session_id: session_id || "voice",
      });
    }

    // ─── PLUGINS: capacidades extendidas antes del cerebro ─────────────────────
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

    // ─── MODO TEXTO: V con su voz real (Anthropic directo) ────────────────────
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada — V no puede pensar" },
        { status: 503 }
      );
    }

    // Rehidratar historial desde DB si hay session_id válido y el cliente
    // no mandó history (sesión retomada entre dispositivos/recargas)
    let contextHistory: ChatTurn[] = safeHistory;
    if (persistable && safeHistory.length === 0) {
      try {
        const dbMsgs = await getVMessages(session_id);
        contextHistory = dbMsgs.slice(-MAX_HISTORY_TURNS * 2).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      } catch {
        // best-effort — si falla la DB, seguimos sin historial
      }
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...contextHistory
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model: V_TEXT_MODEL,
      max_tokens: 2048,
      system: V_TEXT_SYSTEM_PROMPT,
      messages,
    });

    const reply =
      response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("") || "Perdón hermano, me perdí. ¿Me lo repites?";

    if (persistable) {
      await persistVTurn({
        sessionId: session_id,
        userText: message,
        assistantText: reply,
        model: V_TEXT_MODEL,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      reply,
      mode: "text",
      model: V_TEXT_MODEL,
      session_id: session_id || "default",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[V chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
