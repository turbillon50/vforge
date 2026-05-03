"use client";

import { useEffect, useRef, useState } from "react";
import { ChatStream } from "@/components/vforge/chat-stream";
import { Composer } from "@/components/vforge/composer";
import type { ChatMessageData } from "@/components/vforge/chat-message";

function makeSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ForgePage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "forge",
      content: "Hola Luis. Soy V — tu asociada digital. Tengo memoria persistente, conozco tu portafolio (34 repos), el método vForge, y los ADRs. Pregúntame lo que sea o dale start con cualquier idea.",
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  const sessionIdRef = useRef<string>(makeSessionId());

  // Re-issue session id on first mount of the session (per browser tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = sessionStorage.getItem("vforge_session_id");
    if (existing) {
      sessionIdRef.current = existing;
    } else {
      sessionStorage.setItem("vforge_session_id", sessionIdRef.current);
    }
  }, []);

  const handleSend = async (
    content: string,
    attachments?: { id: string; kind: string; label: string; meta: string }[],
  ) => {
    if (streaming) return;
    const attachmentNote =
      attachments && attachments.length > 0
        ? `\n\n📎 ${attachments.length} adjunto${attachments.length === 1 ? "" : "s"}: ${attachments.map((a) => a.label).join(", ")}`
        : "";
    const userTurn: ChatMessageData = {
      id: `u_${Date.now()}`,
      role: "user",
      content: content + attachmentNote,
    };
    const assistantId = `a_${Date.now()}`;
    const assistantTurn: ChatMessageData = {
      id: assistantId,
      role: "forge",
      content: "",
    };
    setMessages((prev) => [...prev, userTurn, assistantTurn]);
    setStreaming(true);

    // Build the Anthropic-compatible chat history (drop UI-only welcome)
    const history = [
      ...messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role === "forge" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
      { role: "user" as const, content: userTurn.content },
    ];

    try {
      const res = await fetch("/api/forge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionId: sessionIdRef.current,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        appendError(assistantId, `Error del servidor (${res.status}): ${err.slice(0, 200)}`);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as
              | { type: "text"; value: string }
              | { type: "done"; tokensIn: number; tokensOut: number; model: string }
              | { type: "error"; message: string };
            if (evt.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + evt.value }
                    : m,
                ),
              );
            } else if (evt.type === "error") {
              appendError(assistantId, evt.message);
            }
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendError(assistantId, `Error de red: ${message}`);
    } finally {
      setStreaming(false);
    }
  };

  function appendError(assistantId: string, msg: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: m.content || `⚠ ${msg}` }
          : m,
      ),
    );
  }

  const handleAction = (action: string) => {
    void handleSend(action.toLowerCase());
  };

  return (
    <div className="flex flex-col h-full -mx-4 md:-mx-6 -mt-6 -mb-6">
      <header className="sticky top-0 z-10 bg-vf-bg border-b border-vf-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight-vf text-vf-fg">
          V
        </h1>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full bg-vf-green ${streaming ? "" : "dot-live"}`}
          />
          <span className="text-sm text-vf-fg-1">
            {streaming ? "Pensando…" : "Listo"}
          </span>
        </div>
      </header>

      <ChatStream messages={messages} onAction={handleAction} />

      <Composer onSend={handleSend} disabled={streaming} />
    </div>
  );
}
