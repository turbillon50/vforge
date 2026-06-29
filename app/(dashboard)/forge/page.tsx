"use client";
import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Types ───────────────────────────────────────────────────────── */
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: string;
  ts: number;
}
interface Session { id: string; title: string; msgs: Msg[]; ts: number; }

/* ─── Slash commands ──────────────────────────────────────────────── */
const SLASH = [
  { cmd: "/deploy",  desc: "Despliega el proyecto activo en Vercel" },
  { cmd: "/secret",  desc: "Consulta o agrega un secret del vault" },
  { cmd: "/repo",    desc: "Lista o analiza repos de GitHub" },
  { cmd: "/status",  desc: "Estado de la infraestructura" },
  { cmd: "/plan",    desc: "V planea antes de ejecutar" },
  { cmd: "/recap",   desc: "Resumen de esta sesión" },
  { cmd: "/deploy",  desc: "Despliega el proyecto activo" },
];

/* ─── Icons ───────────────────────────────────────────────────────── */
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const HistIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.65"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
  </svg>
);
const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

/* ─── Helpers ─────────────────────────────────────────────────────── */
function uid() { return crypto.randomUUID(); }

function ToolBadge({ name }: { name: string }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px",
      fontSize:11, fontFamily:"monospace", background:"rgba(124,58,237,0.1)",
      color:"#a78bfa", border:"1px solid rgba(124,58,237,0.25)", borderRadius:5, marginBottom:6 }}>
      ↻ {name}
    </span>
  );
}

/* ─── Markdown básico ─────────────────────────────────────────────── */
function renderMd(text: string) {
  // bold, code inline, code block, listas, saltos
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let codeBlock: string[] = [];
  let inCode = false;
  let keyIdx = 0;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        result.push(
          <pre key={keyIdx++} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:8, padding:"10px 14px", overflowX:"auto", fontSize:12,
            fontFamily:"monospace", color:"#e5e5e5", margin:"8px 0" }}>
            <code>{codeBlock.join("\n")}</code>
          </pre>
        );
        codeBlock = []; inCode = false;
      } else { inCode = true; }
      continue;
    }
    if (inCode) { codeBlock.push(line); continue; }

    // inline formatting
    const formatted = line
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} style={{ color:"#fff" }}>{part.slice(2,-2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} style={{ background:"rgba(124,58,237,0.15)", color:"#c4b5fd",
            padding:"1px 5px", borderRadius:3, fontSize:"0.9em", fontFamily:"monospace" }}>{part.slice(1,-1)}</code>;
        return part;
      });

    if (line.startsWith("- ") || line.startsWith("• ")) {
      result.push(
        <div key={keyIdx++} style={{ display:"flex", gap:8, marginBottom:3 }}>
          <span style={{ color:"rgba(124,58,237,0.7)", flexShrink:0 }}>·</span>
          <span>{formatted.slice(1)}</span>
        </div>
      );
    } else if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      const lvl = line.match(/^(#+) /)?.[1].length ?? 1;
      const txt = line.replace(/^#+\s/, "");
      result.push(
        <p key={keyIdx++} style={{ fontWeight:700, fontSize: lvl===1?16:lvl===2?14:13,
          color:"#fff", margin:"10px 0 4px" }}>{txt}</p>
      );
    } else if (line.trim() === "") {
      result.push(<div key={keyIdx++} style={{ height:6 }} />);
    } else {
      result.push(
        <p key={keyIdx++} style={{ margin:"2px 0", lineHeight:1.65 }}>{formatted}</p>
      );
    }
  }
  return result;
}

/* ─── Message ─────────────────────────────────────────────────────── */
function Message({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"0 0 0 60px" }}>
        <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:12, padding:"10px 14px", fontSize:14, color:"#e5e5e5",
          lineHeight:1.55, maxWidth:680, whiteSpace:"pre-wrap" }}>
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding:"0 60px 0 0", maxWidth:720 }}>
      {msg.tool && <ToolBadge name={msg.tool} />}
      <div style={{ fontSize:14, color:"rgba(255,255,255,0.85)", lineHeight:1.65 }}>
        {msg.content
          ? renderMd(msg.content)
          : <span style={{ display:"inline-block", width:2, height:16, background:"#8b5cf6",
              marginLeft:2, verticalAlign:"middle", animation:"blink 1s step-end infinite" }} />}
      </div>
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "¿Qué proyectos tengo en producción?",
  "Analiza mis repos y sugiere cuáles limpiar",
  "Dame el estado de mis secrets del vault",
  "/plan — diseña el flujo para mi siguiente app",
];
function EmptyState({ onPick }: { onPick:(s:string)=>void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", padding:"48px 24px", gap:24 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:52, height:52, borderRadius:14, margin:"0 auto 14px",
          background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.25)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:24, fontWeight:700, color:"#a78bfa" }}>V</div>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#fff", margin:"0 0 6px" }}>Chat con V</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", margin:0 }}>
          Tu copiloto de infraestructura. Escribe <code style={{ color:"#8b5cf6" }}>/</code> para comandos.
        </p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:560, width:"100%" }}>
        {SUGGESTIONS.map((s,i) => (
          <button key={i} onClick={() => onPick(s)}
            style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:9, padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,0.45)",
              textAlign:"left", cursor:"pointer", transition:"all 100ms", lineHeight:1.4 }}
            onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor="rgba(255,255,255,0.15)"; el.style.color="rgba(255,255,255,0.75)"; }}
            onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor="rgba(255,255,255,0.07)"; el.style.color="rgba(255,255,255,0.45)"; }}>
            {s}
          </button>
        ))}
      </div>
      <p style={{ fontSize:10, color:"rgba(255,255,255,0.15)", fontFamily:"monospace" }}>
        ↵ Enter · Shift+↵ nueva línea · ⌘K limpiar · ⌘E exportar
      </p>
    </div>
  );
}

/* ─── SlashMenu ───────────────────────────────────────────────────── */
function SlashMenu({ query, onSelect }: { query:string; onSelect:(c:string)=>void }) {
  const filtered = SLASH.filter((c,i,a) => a.findIndex(x=>x.cmd===c.cmd)===i && c.cmd.includes(query.toLowerCase()));
  if (!filtered.length) return null;
  return (
    <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:0, right:0,
      background:"#111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
      overflow:"hidden", zIndex:50, boxShadow:"0 8px 32px rgba(0,0,0,0.7)" }}>
      {filtered.map((c,i) => (
        <button key={i} onClick={() => onSelect(c.cmd)}
          style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"9px 14px",
            background:"transparent", border:"none", cursor:"pointer", transition:"background 80ms" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background="rgba(124,58,237,0.12)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background="transparent")}>
          <code style={{ color:"#a78bfa", fontSize:12, minWidth:80 }}>{c.cmd}</code>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{c.desc}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── History sidebar ─────────────────────────────────────────────── */
function HistSidebar({ sessions, activeId, onLoad, onDelete, onNew }:
  { sessions:Session[]; activeId:string|null; onLoad:(s:Session)=>void; onDelete:(id:string)=>void; onNew:()=>void }) {
  return (
    <div style={{ width:220, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.06)",
      display:"flex", flexDirection:"column", background:"#050508", overflowY:"auto" }}>
      <div style={{ padding:"10px 10px 8px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onNew} style={{ width:"100%", padding:"7px 12px",
          background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.25)",
          borderRadius:8, color:"#a78bfa", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          + Nueva sesión
        </button>
      </div>
      <div style={{ flex:1, padding:"6px 8px" }}>
        {sessions.length === 0 && (
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", padding:"8px 4px" }}>Sin sesiones previas</p>
        )}
        {sessions.map(s => (
          <div key={s.id} onClick={() => onLoad(s)}
            style={{ display:"flex", alignItems:"center", gap:6, borderRadius:7, padding:"7px 8px",
              marginBottom:2, cursor:"pointer",
              background: activeId===s.id ? "rgba(124,58,237,0.14)" : "transparent",
              border: activeId===s.id ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent" }}
            onMouseEnter={e => { if(activeId!==s.id)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if(activeId!==s.id)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
            <span style={{ flex:1, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              color: activeId===s.id ? "#c4b5fd" : "rgba(255,255,255,0.45)" }}>{s.title}</span>
            <button onClick={e => { e.stopPropagation(); onDelete(s.id); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.2)",
                padding:2, flexShrink:0, display:"flex" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color="rgba(239,68,68,0.7)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.2)")}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ MAIN PAGE ═══════════════════════════════════════════════════════ */
export default function ForgePage() {
  const [msgs,        setMsgs]        = useState<Msg[]>([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [activeTool,  setActiveTool]  = useState<string|null>(null);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [activeId,    setActiveId]    = useState<string|null>(null);
  const [showHist,    setShowHist]    = useState(false);
  const [slashQ,      setSlashQ]      = useState<string|null>(null);
  const [sessionId]                   = useState(uid);         // fijo por página
  const bottomRef    = useRef<HTMLDivElement>(null);
  const taRef        = useRef<HTMLTextAreaElement>(null);

  /* scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  /* load sessions */
  useEffect(() => {
    try { const r = localStorage.getItem("vf_sessions"); if (r) setSessions(JSON.parse(r)); } catch {}
  }, []);

  /* persist sessions */
  useEffect(() => {
    try { localStorage.setItem("vf_sessions", JSON.stringify(sessions.slice(0,20))); } catch {}
  }, [sessions]);

  /* keyboard */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey||e.ctrlKey) && e.key==="k") { e.preventDefault(); clearChat(); }
      if ((e.metaKey||e.ctrlKey) && e.key==="e") { e.preventDefault(); exportMd(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  function clearChat() {
    setMsgs([]); setInput(""); setActiveId(null);
    if (taRef.current) taRef.current.style.height = "auto";
  }

  function exportMd() {
    if (!msgs.length) return;
    const md = msgs.map(m => `**${m.role==="user"?"Tú":"V"}:**\n${m.content}`).join("\n\n---\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], {type:"text/markdown"}));
    a.download = `forge-${Date.now()}.md`; a.click();
  }

  function saveSession() {
    if (!msgs.length) return;
    const title = msgs.find(m=>m.role==="user")?.content.slice(0,45) ?? "Sesión";
    const id = uid();
    setSessions(prev => [{ id, title, msgs, ts:Date.now() }, ...prev]);
    setActiveId(id);
    try { localStorage.setItem(`vf_msgs_${id}`, JSON.stringify(msgs)); } catch {}
  }

  function loadSession(s: Session) {
    setMsgs(s.msgs); setActiveId(s.id);
    try { const r = localStorage.getItem(`vf_msgs_${s.id}`); if(r) setMsgs(JSON.parse(r)); } catch {}
  }

  function deleteSession(id: string) {
    setSessions(prev => prev.filter(s=>s.id!==id));
    try { localStorage.removeItem(`vf_msgs_${id}`); } catch {}
    if (activeId===id) clearChat();
  }

  function newSession() {
    if (msgs.length) saveSession();
    clearChat();
    setTimeout(() => taRef.current?.focus(), 50);
  }

  /* input */
  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setInput(v);
    const t = e.target;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 180) + "px";
    setSlashQ(v.startsWith("/") && !v.includes(" ") ? v : null);
  }

  /* ── SEND — contrato correcto con la API ── */
  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput(""); setSlashQ(null);
    if (taRef.current) taRef.current.style.height = "auto";

    const userMsg: Msg = { id:uid(), role:"user", content:text, ts:Date.now() };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setLoading(true); setActiveTool(null);

    const asstId = uid();
    setMsgs(prev => [...prev, { id:asstId, role:"assistant", content:"", ts:Date.now() }]);

    try {
      /* ← Contrato correcto: messages array + sessionId */
      const apiMessages = nextMsgs.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/forge/run", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ messages: apiMessages, sessionId }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(err || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("Sin stream en la respuesta");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
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
            if (ev.type === "text_delta" && ev.text) {
              setMsgs(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: m.content + ev.text } : m
              ));
            }
            if (ev.type === "tool_use")    setActiveTool(ev.name ?? null);
            if (ev.type === "tool_result") setActiveTool(null);
            // Compatibilidad con formato OpenAI chunks
            if (ev.choices?.[0]?.delta?.content) {
              setMsgs(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: m.content + ev.choices[0].delta.content } : m
              ));
            }
          } catch {}
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMsgs(prev => prev.map(m =>
        m.id === asstId
          ? { ...m, content:`⚠ Error al conectar con V: ${msg}\n\nVerifica que tengas una clave de modelo configurada en Settings → API.` }
          : m
      ));
    } finally {
      setLoading(false); setActiveTool(null);
    }
  }, [input, loading, msgs, sessionId]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") { setSlashQ(null); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:"#09090e" }}>

      {/* Historial */}
      {showHist && (
        <HistSidebar sessions={sessions} activeId={activeId}
          onLoad={loadSession} onDelete={deleteSession} onNew={newSession} />
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"8px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0,
          background:"#09090e" }}>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => setShowHist(h=>!h)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px",
                background: showHist ? "rgba(124,58,237,0.12)" : "transparent",
                border:`1px solid ${showHist ? "rgba(124,58,237,0.3)":"rgba(255,255,255,0.08)"}`,
                borderRadius:7, cursor:"pointer", color:"rgba(255,255,255,0.5)", fontSize:12 }}>
              <HistIcon /> Historial
            </button>
            {msgs.length > 0 && (
              <button onClick={newSession}
                style={{ padding:"5px 10px", background:"transparent", fontSize:12,
                  border:"1px solid rgba(255,255,255,0.08)", borderRadius:7,
                  cursor:"pointer", color:"rgba(255,255,255,0.4)" }}>
                + Nueva
              </button>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {msgs.length > 0 && (
              <>
                <button onClick={saveSession}
                  style={{ padding:"5px 10px", background:"transparent", fontSize:12,
                    border:"1px solid rgba(255,255,255,0.08)", borderRadius:7,
                    cursor:"pointer", color:"rgba(255,255,255,0.4)" }}>
                  Guardar
                </button>
                <button onClick={exportMd}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px",
                    background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:7, cursor:"pointer", color:"rgba(255,255,255,0.4)", fontSize:12 }}>
                  <ExportIcon /> .md
                </button>
              </>
            )}
            <span style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.14)" }}>
              ⌘K limpiar · ⌘E exportar
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"thin",
          scrollbarColor:"rgba(255,255,255,0.08) transparent" }}>
          {msgs.length === 0
            ? <EmptyState onPick={s => send(s)} />
            : (
              <div style={{ maxWidth:760, margin:"0 auto", padding:"28px 20px 8px",
                display:"flex", flexDirection:"column", gap:20 }}>
                {msgs.map(m => <Message key={m.id} msg={m} />)}
                {loading && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:4 }}>
                    {activeTool
                      ? <ToolBadge name={activeTool} />
                      : <span style={{ fontFamily:"monospace", fontSize:18,
                          color:"rgba(124,58,237,0.7)", letterSpacing:3 }}>
                          ···
                        </span>}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
        </div>

        {/* Composer */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"12px 16px 16px",
          background:"#09090e", flexShrink:0 }}>
          <div style={{ maxWidth:760, margin:"0 auto", position:"relative" }}>
            {slashQ !== null && <SlashMenu query={slashQ} onSelect={cmd => { setInput(cmd+" "); setSlashQ(null); taRef.current?.focus(); }} />}
            <div style={{ display:"flex", alignItems:"flex-end", gap:10,
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)",
              borderRadius:12, padding:"11px 14px", transition:"border-color 150ms" }}
              onFocusCapture={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.18)")}
              onBlurCapture={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.09)")}>
              <textarea ref={taRef} rows={1} value={input}
                placeholder="Pregunta a V… o escribe / para comandos"
                onChange={onInputChange} onKeyDown={onKeyDown}
                style={{ flex:1, background:"none", border:"none", outline:"none",
                  color:"#e5e5e5", fontSize:14, lineHeight:1.55, resize:"none",
                  fontFamily:"inherit", minHeight:22, maxHeight:180 }} />
              <button onClick={() => send()} disabled={!input.trim()||loading}
                style={{ background: input.trim()&&!loading ? "#fff":"rgba(255,255,255,0.07)",
                  color: input.trim()&&!loading ? "#000":"rgba(255,255,255,0.2)",
                  border:"none", borderRadius:8, padding:"7px 12px", cursor: input.trim()&&!loading?"pointer":"not-allowed",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 150ms", flexShrink:0, minWidth:36 }}>
                <SendIcon />
              </button>
            </div>
            <p style={{ fontSize:10, color:"rgba(255,255,255,0.12)", marginTop:5,
              fontFamily:"monospace", textAlign:"center" }}>
              Enter enviar · Shift+Enter nueva línea · / comandos
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
