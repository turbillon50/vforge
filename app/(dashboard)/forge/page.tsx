"use client";
import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Types ───────────────────────────────────────────────────────────── */
interface Msg {
  id: string; role: "user" | "assistant"; content: string;
  tool?: string; ts: number; exported?: boolean;
}
interface Session { id: string; title: string; ts: number; }

/* ─── Slash commands ──────────────────────────────────────────────────── */
const SLASH_COMMANDS = [
  { cmd: "/deploy",   desc: "Despliega el proyecto activo en Vercel" },
  { cmd: "/secret",   desc: "Agrega o consulta un secret del vault" },
  { cmd: "/repo",     desc: "Lista o analiza repos de GitHub" },
  { cmd: "/status",   desc: "Estado de la infraestructura" },
  { cmd: "/plan",     desc: "V planea antes de ejecutar" },
  { cmd: "/recap",    desc: "Resumen de la sesión actual" },
];

/* ─── Icons ───────────────────────────────────────────────────────────── */
function SendIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function ExportIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
function HistoryIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.65"/></svg>;
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
}

/* ─── ToolBadge ───────────────────────────────────────────────────────── */
function ToolBadge({ name }: { name: string }) {
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", fontSize:"11px",
      fontFamily:"monospace", background:"rgba(124,58,237,0.1)", color:"#8b5cf6",
      border:"1px solid rgba(124,58,237,0.2)", borderRadius:"4px", marginBottom:"6px" }}>
      {name}
    </span>
  );
}

/* ─── Message ─────────────────────────────────────────────────────────── */
function Message({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"0 0 0 80px" }}>
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"10px", padding:"10px 14px", fontSize:"14px", color:"#e5e5e5",
          lineHeight:"1.5", maxWidth:"640px" }}>
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display:"flex", justifyContent:"flex-start", padding:"0 80px 0 0" }}>
      <div style={{ maxWidth:"640px", width:"100%" }}>
        {msg.tool && <ToolBadge name={msg.tool} />}
        <p style={{ fontSize:"14px", color:"#ccc", lineHeight:"1.65", margin:0, whiteSpace:"pre-wrap" }}>
          {msg.content}
          {!msg.content && (
            <span style={{ display:"inline-block", width:2, height:16, background:"#8b5cf6",
              marginLeft:2, verticalAlign:"middle", animation:"blink 1s step-end infinite" }} />
          )}
        </p>
      </div>
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "¿Qué proyectos tengo en producción?",
  "Analiza mis repos y sugiere cuáles necesitan atención",
  "Dame el estado de mis secrets del vault",
  "/plan — diseña el flujo para un nuevo proyecto",
];
function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      height:"100%", padding:"48px 24px", gap:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, borderRadius:12, background:"rgba(124,58,237,0.1)",
          border:"1px solid rgba(124,58,237,0.2)", display:"flex", alignItems:"center",
          justifyContent:"center", margin:"0 auto 16px" }}>
          <span style={{ fontSize:22 }}>V</span>
        </div>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#fff", margin:"0 0 6px" }}>Forge — Chat con V</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", margin:0 }}>
          Tu copiloto de infraestructura. Usa <code style={{ color:"#8b5cf6" }}>/</code> para comandos rápidos.
        </p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:560, width:"100%" }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => onSuggestion(s)}
            style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:8, padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,0.45)",
              textAlign:"left", cursor:"pointer", transition:"all 100ms" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="rgba(255,255,255,0.14)"; el.style.color="rgba(255,255,255,0.7)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="rgba(255,255,255,0.07)"; el.style.color="rgba(255,255,255,0.45)"; }}>
            {s}
          </button>
        ))}
      </div>
      <p style={{ fontSize:11, color:"rgba(255,255,255,0.15)", fontFamily:"monospace" }}>
        ↵ Enter para enviar · Shift+↵ nueva línea · ⌘K limpiar
      </p>
    </div>
  );
}

/* ─── SlashMenu ───────────────────────────────────────────────────────── */
function SlashMenu({ query, onSelect }: { query: string; onSelect: (cmd: string) => void }) {
  const filtered = SLASH_COMMANDS.filter(c => c.cmd.includes(query.toLowerCase()));
  if (!filtered.length) return null;
  return (
    <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:0, right:0,
      background:"#111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
      overflow:"hidden", zIndex:50, boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
      {filtered.map((c, i) => (
        <button key={i} onClick={() => onSelect(c.cmd)}
          style={{ display:"flex", alignItems:"center", gap:12, width:"100%",
            padding:"10px 14px", background:"transparent", border:"none",
            cursor:"pointer", transition:"background 80ms" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.1)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
          <code style={{ color:"#8b5cf6", fontSize:12, minWidth:80 }}>{c.cmd}</code>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{c.desc}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── SessionSidebar ──────────────────────────────────────────────────── */
function SessionSidebar({ sessions, activeId, onSelect, onDelete, onNew }:
  { sessions: Session[]; activeId: string | null; onSelect:(id:string)=>void; onDelete:(id:string)=>void; onNew:()=>void }) {
  return (
    <div style={{ width:220, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.06)",
      display:"flex", flexDirection:"column", background:"#050508" }}>
      <div style={{ padding:"12px 12px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onNew}
          style={{ width:"100%", padding:"7px 12px", background:"rgba(124,58,237,0.1)",
            border:"1px solid rgba(124,58,237,0.2)", borderRadius:8, color:"#a78bfa",
            fontSize:12, fontWeight:600, cursor:"pointer" }}>
          + Nueva sesión
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"6px 8px" }}>
        {sessions.length === 0 && (
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", padding:"8px 4px" }}>Sin sesiones previas</p>
        )}
        {sessions.map(s => (
          <div key={s.id} onClick={() => onSelect(s.id)}
            style={{ display:"flex", alignItems:"center", gap:6, borderRadius:7, padding:"7px 8px",
              marginBottom:2, cursor:"pointer", background: activeId === s.id ? "rgba(124,58,237,0.12)" : "transparent",
              border: activeId === s.id ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent" }}>
            <span style={{ flex:1, fontSize:12, color: activeId===s.id ? "#c4b5fd" : "rgba(255,255,255,0.45)",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.title}</span>
            <button onClick={e => { e.stopPropagation(); onDelete(s.id); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.2)",
                padding:2, flexShrink:0, opacity:0 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity="1")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity="0")}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────── */
export default function ForgePage() {
  const [msgs, setMsgs]             = useState<Msg[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showHistory, setShowHistory]     = useState(false);
  const [slashQuery, setSlashQuery]       = useState<string | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  /* scroll to bottom */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  /* load sessions from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("forge_sessions");
      if (raw) setSessions(JSON.parse(raw));
    } catch {}
  }, []);

  /* persist sessions */
  useEffect(() => {
    try { localStorage.setItem("forge_sessions", JSON.stringify(sessions)); } catch {}
  }, [sessions]);

  /* keyboard shortcuts */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setMsgs([]); setInput(""); setActiveSession(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault(); exportMd();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [msgs]);

  /* export to markdown */
  function exportMd() {
    if (!msgs.length) return;
    const md = msgs.map(m => `**${m.role === "user" ? "Tú" : "V"}:** ${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type:"text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `forge-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  /* save session */
  function saveSession() {
    if (!msgs.length) return;
    const firstUser = msgs.find(m => m.role === "user");
    const title = firstUser?.content.slice(0, 40) ?? "Sesión sin título";
    const id    = crypto.randomUUID();
    const sess: Session = { id, title, ts: Date.now() };
    setSessions(prev => [sess, ...prev.slice(0, 19)]);
    setActiveSession(id);
    try { localStorage.setItem(`forge_msgs_${id}`, JSON.stringify(msgs)); } catch {}
  }

  /* load session */
  function loadSession(id: string) {
    try {
      const raw = localStorage.getItem(`forge_msgs_${id}`);
      if (raw) { setMsgs(JSON.parse(raw)); setActiveSession(id); }
    } catch {}
  }

  /* delete session */
  function deleteSession(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id));
    try { localStorage.removeItem(`forge_msgs_${id}`); } catch {}
    if (activeSession === id) { setMsgs([]); setActiveSession(null); }
  }

  /* new session */
  function newSession() {
    if (msgs.length) saveSession();
    setMsgs([]); setInput(""); setActiveSession(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    textareaRef.current?.focus();
  }

  /* input change — detectar slash */
  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);
    const t = e.target;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 180) + "px";
    if (val.startsWith("/") && !val.includes(" ")) setSlashQuery(val);
    else setSlashQuery(null);
  }

  /* slash command select */
  function selectSlash(cmd: string) {
    setInput(cmd + " ");
    setSlashQuery(null);
    textareaRef.current?.focus();
  }

  /* send */
  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput(""); setSlashQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Msg = { id: crypto.randomUUID(), role:"user", content:text, ts:Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true); setActiveTool(null);

    const assistantId = crypto.randomUUID();
    setMsgs(prev => [...prev, { id:assistantId, role:"assistant", content:"", ts:Date.now() }]);

    try {
      const res = await fetch("/api/forge/run", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "text_delta") {
              setMsgs(prev => prev.map(m => m.id === assistantId
                ? { ...m, content: m.content + ev.text } : m));
            }
            if (ev.type === "tool_use") setActiveTool(ev.name ?? null);
            if (ev.type === "tool_result") setActiveTool(null);
          } catch {}
        }
      }
    } catch (err) {
      setMsgs(prev => prev.map(m => m.id === assistantId
        ? { ...m, content:`Error: ${err instanceof Error ? err.message : String(err)}` } : m));
    } finally {
      setLoading(false); setActiveTool(null);
    }
  }, [input, loading]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && slashQuery !== null) { setSlashQuery(null); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display:"flex", height:"100%", background:"#0a0a0f", overflow:"hidden" }}>

      {/* Sidebar historial */}
      {showHistory && (
        <SessionSidebar sessions={sessions} activeId={activeSession}
          onSelect={loadSession} onDelete={deleteSession} onNew={newSession} />
      )}

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setShowHistory(h => !h)}
              style={{ background: showHistory ? "rgba(124,58,237,0.12)" : "transparent",
                border:"1px solid " + (showHistory ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.08)"),
                borderRadius:7, padding:"5px 10px", cursor:"pointer", color:"rgba(255,255,255,0.5)",
                display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
              <HistoryIcon /> Historial
            </button>
            {msgs.length > 0 && (
              <button onClick={newSession}
                style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:7, padding:"5px 10px", cursor:"pointer", color:"rgba(255,255,255,0.4)", fontSize:12 }}>
                + Nueva
              </button>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {msgs.length > 0 && (
              <>
                <button onClick={saveSession}
                  style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:7, padding:"5px 10px", cursor:"pointer", color:"rgba(255,255,255,0.4)", fontSize:12 }}>
                  Guardar
                </button>
                <button onClick={exportMd}
                  style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:7, padding:"5px 10px", cursor:"pointer", color:"rgba(255,255,255,0.4)",
                    fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
                  <ExportIcon /> .md
                </button>
              </>
            )}
            <span style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.15)" }}>
              ⌘K limpiar · ⌘E exportar
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 0 8px" }}>
          {msgs.length === 0
            ? <EmptyState onSuggestion={s => send(s)} />
            : <div style={{ maxWidth:760, margin:"0 auto", padding:"32px 24px",
                display:"flex", flexDirection:"column", gap:24 }}>
                {msgs.map(m => <Message key={m.id} msg={m} />)}
                {loading && (
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {activeTool
                      ? <ToolBadge name={`↻ ${activeTool}`} />
                      : <span style={{ fontSize:20, color:"#8b5cf6", letterSpacing:2 }}>
                          <span style={{ animation:"blink 1s step-end infinite" }}>·</span>
                          <span style={{ animation:"blink 1s step-end 0.33s infinite" }}>·</span>
                          <span style={{ animation:"blink 1s step-end 0.66s infinite" }}>·</span>
                        </span>}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>}
        </div>

        {/* Composer */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"12px 20px 16px",
          background:"#0a0a0f", flexShrink:0 }}>
          <div style={{ maxWidth:760, margin:"0 auto", position:"relative" }} ref={composerRef}>
            {slashQuery !== null && (
              <SlashMenu query={slashQuery} onSelect={selectSlash} />
            )}
            <div style={{ display:"flex", alignItems:"flex-end", gap:12,
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:12, padding:"12px 16px", transition:"border-color 150ms" }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)")}
              onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
              <textarea ref={textareaRef} rows={1}
                placeholder="Pregunta a V… o escribe / para comandos"
                value={input} onChange={onInputChange} onKeyDown={onKeyDown}
                style={{ flex:1, background:"none", border:"none", outline:"none",
                  color:"#e5e5e5", fontSize:14, lineHeight:1.5, resize:"none",
                  fontFamily:"inherit", minHeight:24, maxHeight:180 }} />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.08)",
                  color: input.trim() && !loading ? "#000" : "rgba(255,255,255,0.2)",
                  border:"none", borderRadius:8, padding:"7px 12px", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 150ms", flexShrink:0 }}>
                <SendIcon />
              </button>
            </div>
            <p style={{ fontSize:10, color:"rgba(255,255,255,0.12)", marginTop:6,
              fontFamily:"monospace", textAlign:"center" }}>
              Enter enviar · Shift+Enter nueva línea · / comandos · Esc cerrar menú
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
