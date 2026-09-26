"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: string;
  ts: number;
}

// ─── Icons ─────────────────────────────────────────────────────────────────
function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function ToolBadge({ name }: { name: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: "11px",
        fontFamily: "monospace",
        background: "rgba(124,58,237,0.1)",
        color: "#8b5cf6",
        border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: "4px",
        marginBottom: "6px",
      }}
    >
      {name}
    </span>
  );
}

function Message({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 0 0 80px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "14px",
            color: "#e5e5e5",
            lineHeight: "1.5",
            maxWidth: "640px",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", padding: "0 80px 0 0" }}>
      <div style={{ maxWidth: "640px", width: "100%" }}>
        {msg.tool && <ToolBadge name={msg.tool} />}
        <p
          style={{
            fontSize: "14px",
            color: "#ccc",
            lineHeight: "1.65",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content || (
            <span style={{ color: "#333" }}>
              <span className="thinking-dot">·</span>
              <span className="thinking-dot" style={{ animationDelay: "0.2s" }}>·</span>
              <span className="thinking-dot" style={{ animationDelay: "0.4s" }}>·</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    "¿Qué proyectos tengo en Vercel?",
    "Dame un recap de la semana en GitHub",
    "Revisa los secrets del proyecto crede-ti",
    "¿Cuánto he gastado en tokens este mes?",
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="#8b5cf6" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#e5e5e5",
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
        }}
      >
        Forge / V
      </h2>
      <p style={{ fontSize: "13px", color: "#444", margin: "0 0 32px", maxWidth: "320px" }}>
        AI copilot con acceso a proyectos, GitHub, Vercel, Vault y DNS. Pregunta lo que necesites.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {suggestions.map((s, i) => (
          <button
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "12px",
              color: "#555",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLElement).style.color = "#888";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.color = "#555";
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function ForgePage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ts: Date.now(),
    };
    setMsgs((p) => [...p, userMsg]);
    setLoading(true);
    setActiveTool(null);

    const assistantId = crypto.randomUUID();
    setMsgs((p) => [
      ...p,
      { id: assistantId, role: "assistant", content: "", ts: Date.now() },
    ]);

    try {
      const res = await fetch("/api/forge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "text_delta") {
              setMsgs((p) =>
                p.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (ev.text ?? "") }
                    : m
                )
              );
            } else if (ev.type === "tool_use_start") {
              const toolName = ev.name ?? "tool";
              setActiveTool(toolName);
              setMsgs((p) =>
                p.map((m) =>
                  m.id === assistantId ? { ...m, tool: toolName } : m
                )
              );
            } else if (ev.type === "tool_use_result") {
              setActiveTool(null);
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch {
      setMsgs((p) =>
        p.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Error de conexión. Intenta de nuevo." }
            : m
        )
      );
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  }, [input, loading]);

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const t = e.currentTarget;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 180) + "px";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0a0a0f",
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 0 8px",
        }}
      >
        {msgs.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {msgs.map((m) => (
              <Message key={m.id} msg={m} />
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {activeTool ? (
                  <ToolBadge name={`↻ ${activeTool}`} />
                ) : (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#333",
                      fontFamily: "monospace",
                    }}
                  >
                    <span style={{ animation: "pulse 1.5s infinite" }}>···</span>
                  </span>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 24px 20px",
          background: "#0a0a0f",
        }}
      >
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "12px 16px",
              transition: "border-color 150ms",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.16)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.08)";
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Pregunta algo a V..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              onInput={autoResize}
              disabled={loading}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#e5e5e5",
                resize: "none",
                fontFamily: "inherit",
                lineHeight: "1.5",
                minHeight: "21px",
                maxHeight: "180px",
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                flexShrink: 0,
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: input.trim() && !loading ? "#7c3aed" : "rgba(255,255,255,0.05)",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: input.trim() && !loading ? "#fff" : "#333",
                transition: "all 150ms",
              }}
            >
              <SendIcon />
            </button>
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "#2a2a2a",
              marginTop: "8px",
              textAlign: "center",
              fontFamily: "monospace",
            }}
          >
            Enter · enviar &nbsp;·&nbsp; Shift+Enter · nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}
