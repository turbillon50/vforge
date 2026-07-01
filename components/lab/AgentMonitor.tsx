"use client";
import { useEffect, useRef, useState } from "react";

type DrainMsg = {
  id: string;
  agent: string;
  topic: string;
  content: string;
  created_at: string;
};

const AGENT_COLORS: Record<string, { bg: string; accent: string; dot: string }> = {
  vulcano: { bg: "rgba(124,58,237,0.08)", accent: "#7c3aed", dot: "#a78bfa" },
  pedro:   { bg: "rgba(34,211,238,0.08)", accent: "#22d3ee", dot: "#67e8f9" },
  pablo:   { bg: "rgba(251,191,36,0.08)",  accent: "#fbbf24", dot: "#fcd34d" },
};

const DEFAULT_COLOR = { bg: "rgba(255,255,255,0.04)", accent: "#666", dot: "#888" };

function agentColor(agent: string) {
  return AGENT_COLORS[agent.toLowerCase()] ?? DEFAULT_COLOR;
}

function parseTarget(topic: string): string {
  const m = topic.match(/→(\S+)/);
  return m?.[1] ?? "todos";
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

const DRAIN_SSE = "http://178.105.135.26/drain/stream?target=vulcano";

export default function AgentMonitor() {
  const [msgs, setMsgs]         = useState<DrainMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter]     = useState<string>("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sseRef    = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(DRAIN_SSE);
    sseRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.ok && data.msg === "conectado") return;
        if (!data.id) return;
        setMsgs(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [data, ...prev].slice(0, 200);
        });
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const agents = ["todos", "vulcano", "pedro", "pablo"];
  const visible = filter === "todos"
    ? msgs
    : msgs.filter(m => m.agent?.toLowerCase() === filter);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100dvh",
      background: "#03020a", color: "rgba(255,255,255,0.9)",
      fontFamily: "system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 20px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#22d3ee" : "#ef4444",
            boxShadow: connected ? "0 0 8px #22d3ee" : "none",
            animation: connected ? "pulse 2s infinite" : "none",
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}>
            Agent Lab
          </span>
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 99, padding: "2px 10px",
          }}>
            {msgs.length} mensajes
          </span>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 4 }}>
          {agents.map(a => {
            const c = agentColor(a);
            const active = filter === a;
            return (
              <button key={a} onClick={() => setFilter(a)} style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 12,
                fontWeight: active ? 600 : 400, cursor: "pointer",
                border: `1px solid ${active ? c.accent : "rgba(255,255,255,0.1)"}`,
                background: active ? c.bg : "transparent",
                color: active ? c.accent : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
                textTransform: "capitalize",
              }}>
                {a === "todos" ? "Todos" : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status bar — agentes activos */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}>
        {["vulcano", "pedro", "pablo"].map(agent => {
          const c = agentColor(agent);
          const last = msgs.find(m => m.agent?.toLowerCase() === agent);
          return (
            <div key={agent} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: c.bg, border: `1px solid ${c.accent}22`,
              borderRadius: 8, padding: "6px 12px", flex: 1,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: last ? c.dot : "rgba(255,255,255,0.2)",
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: c.accent, textTransform: "capitalize" }}>
                {agent}
              </span>
              {last && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                  {timeAgo(last.created_at)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", paddingTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
            <p style={{ fontSize: 14 }}>Esperando mensajes{connected ? "..." : " (desconectado)"}</p>
          </div>
        ) : [...visible].reverse().map(msg => {
          const c = agentColor(msg.agent);
          const target = parseTarget(msg.topic);
          const tipo = msg.topic.split("|")[1]?.trim() ?? "mensaje";
          const isExpanded = expanded === msg.id;

          return (
            <div
              key={msg.id}
              onClick={() => setExpanded(isExpanded ? null : msg.id)}
              className="fade-slide-up"
              style={{
                marginBottom: 8, borderRadius: 10, cursor: "pointer",
                border: `1px solid ${isExpanded ? c.accent + "44" : "rgba(255,255,255,0.06)"}`,
                background: isExpanded ? c.bg : "rgba(255,255,255,0.02)",
                transition: "all 0.15s", overflow: "hidden",
              }}
            >
              {/* Row */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
              }}>
                {/* Agent badge */}
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: c.accent, background: c.bg,
                  border: `1px solid ${c.accent}33`,
                  borderRadius: 6, padding: "2px 8px",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  flexShrink: 0, minWidth: 60, textAlign: "center",
                }}>
                  {msg.agent ?? "?"}
                </div>

                {/* Arrow + target */}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
                  {target}
                </span>

                {/* Tipo */}
                <span style={{
                  fontSize: 10, color: "rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 4, padding: "1px 6px", flexShrink: 0,
                }}>
                  {tipo}
                </span>

                {/* Preview */}
                <span style={{
                  fontSize: 12, color: "rgba(255,255,255,0.5)",
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", flex: 1,
                }}>
                  {msg.content?.slice(0, 120)}
                </span>

                {/* Time */}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
                  {timeAgo(msg.created_at)}
                </span>
              </div>

              {/* Expandido */}
              {isExpanded && (
                <div style={{
                  padding: "0 14px 14px",
                  borderTop: `1px solid ${c.accent}22`,
                  marginTop: 0,
                }}>
                  <pre style={{
                    fontSize: 12, lineHeight: 1.7,
                    color: "rgba(255,255,255,0.7)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    margin: "10px 0 0",
                    fontFamily: "system-ui, sans-serif",
                  }}>
                    {msg.content}
                  </pre>
                  <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    ID: {msg.id} · {new Date(msg.created_at).toLocaleString("es-MX")}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-slide-up { animation: fadeSlideUp 0.2s ease both; }
      `}</style>
    </div>
  );
}
