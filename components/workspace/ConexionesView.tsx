"use client";
import { useEffect, useState } from "react";

interface OnboardingStatus { llm: boolean; vercel: boolean; github: boolean; }

const T = {
  fg:           "rgba(255,255,255,0.92)",
  fgSub:        "rgba(255,255,255,0.55)",
  fgMuted:      "rgba(255,255,255,0.32)",
  surface:      "rgba(255,255,255,0.04)",
  surface2:     "rgba(255,255,255,0.07)",
  border:       "rgba(255,255,255,0.08)",
  border2:      "rgba(255,255,255,0.12)",
  accent:       "#a855f7",
  accentBg:     "rgba(168,85,247,0.12)",
  accentBorder: "rgba(168,85,247,0.30)",
  green:        "#34d399",
  greenBg:      "rgba(52,211,153,0.10)",
  greenBorder:  "rgba(52,211,153,0.20)",
  red:          "#f87171",
};

const STEPS = [
  { id: "llm",    label: "Modelo de IA" },
  { id: "vercel", label: "Vercel"       },
  { id: "github", label: "GitHub"       },
];

const LLM_PROVIDERS = [
  { id: "openai",    name: "OpenAI",    desc: "GPT-4o, GPT-4 Turbo"  },
  { id: "anthropic", name: "Anthropic", desc: "Claude 3.5 Sonnet"    },
  { id: "groq",      name: "Groq",      desc: "Llama 3 — rápido"     },
  { id: "gemini",    name: "Google",    desc: "Gemini 1.5 Pro"       },
];

function StepDots({ status }: { status: OnboardingStatus }) {
  const done = STEPS.filter(s => status[s.id as keyof OnboardingStatus]).length;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
      {STEPS.map((s, i) => {
        const completed = status[s.id as keyof OnboardingStatus];
        const active    = !completed && i === done;
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              width:22, height:22, borderRadius:"50%",
              background: completed ? T.accent : "transparent",
              border:     completed ? "none" : `1px solid ${active ? T.accentBorder : T.border}`,
              color:      completed ? "#fff"  : active ? T.fg : T.fgMuted,
              fontSize:11, fontWeight:600,
            }}>
              {completed ? "✓" : i + 1}
            </div>
            <span style={{ fontSize:12, color: completed ? T.fgSub : active ? T.fg : T.fgMuted }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div style={{ width:24, height:1, background:T.border }} />}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:500,
      background: connected ? T.greenBg  : T.surface2,
      color:      connected ? T.green    : T.fgMuted,
      border:     `1px solid ${connected ? T.greenBorder : T.border}`,
    }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background: connected ? T.green : T.fgMuted }} />
      {connected ? "Conectado" : "Sin conectar"}
    </span>
  );
}

interface CardProps { title:string; description:string; connected:boolean; children?:React.ReactNode; }

function ConnectionCard({ title, description, connected, children }: CardProps) {
  return (
    <div style={{
      borderRadius:12, padding:"16px", marginBottom:10,
      background:  connected ? "rgba(168,85,247,0.06)" : T.surface,
      border:      `1px solid ${connected ? T.accentBorder : T.border}`,
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:13, fontWeight:600, color:T.fg }}>{title}</span>
        <StatusBadge connected={connected} />
      </div>
      <p style={{ fontSize:12, color:T.fgMuted, margin:0, marginBottom: children ? 14 : 0 }}>{description}</p>
      {children}
    </div>
  );
}

export function ConexionesView() {
  const [status,         setStatus        ] = useState<OnboardingStatus>({ llm:false, vercel:false, github:false });
  const [loading,        setLoading        ] = useState(true);
  const [vercelToken,    setVercelToken    ] = useState("");
  const [vercelTeam,     setVercelTeam     ] = useState("");
  const [savingVercel,   setSavingVercel   ] = useState(false);
  const [vercelExpanded, setVercelExpanded ] = useState(false);
  const [llmKey,         setLlmKey         ] = useState("");
  const [llmProvider,    setLlmProvider    ] = useState("openai");
  const [savingLlm,      setSavingLlm      ] = useState(false);
  const [llmExpanded,    setLlmExpanded    ] = useState(false);
  const [error,          setError          ] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function connectVercel() {
    if (!vercelToken.trim()) return;
    setSavingVercel(true); setError(null);
    try {
      const r = await fetch("/api/forja/connect-vercel", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ token:vercelToken, teamId:vercelTeam }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      setStatus(s => ({ ...s, vercel:true }));
      setVercelExpanded(false); setVercelToken("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally { setSavingVercel(false); }
  }

  async function connectLlm() {
    if (!llmKey.trim()) return;
    setSavingLlm(true); setError(null);
    try {
      const r = await fetch("/api/forja/connect-llm", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ provider:llmProvider, apiKey:llmKey }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      setStatus(s => ({ ...s, llm:true }));
      setLlmExpanded(false); setLlmKey("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally { setSavingLlm(false); }
  }

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"8px 12px", borderRadius:8,
    background:T.surface2, border:`1px solid ${T.border2}`,
    color:T.fg, fontSize:12, fontFamily:"monospace", outline:"none",
  };
  const btnPrimary = (d:boolean): React.CSSProperties => ({
    padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600,
    cursor:d?"not-allowed":"pointer", background:d?T.surface2:T.accent,
    color:d?T.fgMuted:"#fff", border:"none",
  });
  const btnCancel: React.CSSProperties = {
    padding:"7px 12px", borderRadius:8, fontSize:12,
    background:"transparent", border:"none", color:T.fgMuted, cursor:"pointer",
  };
  const btnConfig: React.CSSProperties = {
    padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:500,
    background:T.surface2, color:T.fgSub, border:`1px solid ${T.border}`, cursor:"pointer",
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200 }}>
      <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${T.border2}`, borderTopColor:T.accent, animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"32px 0" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:18, fontWeight:600, color:T.fg, margin:0, marginBottom:6, letterSpacing:"-0.02em" }}>Conexiones</h1>
        <p style={{ fontSize:13, color:T.fgMuted, margin:0 }}>
          Vincula las herramientas que VForge necesita para construir y desplegar.
        </p>
      </div>

      <StepDots status={status} />

      {status.llm && status.vercel && status.github && (
        <div style={{ borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13,
          background:T.greenBg, border:`1px solid ${T.greenBorder}`, color:T.green }}>
          ✓ Todas las conexiones activas. Listo para construir.
        </div>
      )}
      {error && (
        <div style={{ borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13,
          background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.20)", color:T.red }}>
          {error}
        </div>
      )}

      <ConnectionCard title="Modelo de IA" description="API key del proveedor LLM para tus agentes." connected={status.llm}>
        {!status.llm && (!llmExpanded ? (
          <button style={btnConfig} onClick={() => setLlmExpanded(true)}>Configurar</button>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {LLM_PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setLlmProvider(p.id)} style={{
                  textAlign:"left", padding:"8px 10px", borderRadius:8, fontSize:11, cursor:"pointer",
                  background: llmProvider===p.id ? T.surface2 : "transparent",
                  border: `1px solid ${llmProvider===p.id ? T.border2 : T.border}`,
                  color: llmProvider===p.id ? T.fg : T.fgMuted,
                }}>
                  <div style={{ fontWeight:600 }}>{p.name}</div>
                  <div style={{ fontSize:10, color:T.fgMuted }}>{p.desc}</div>
                </button>
              ))}
            </div>
            <input type="password" value={llmKey} onChange={e => setLlmKey(e.target.value)}
              placeholder="sk-..." style={inputStyle}
              onKeyDown={e => e.key === "Enter" && connectLlm()} />
            <div style={{ display:"flex", gap:8 }}>
              <button disabled={savingLlm||!llmKey.trim()} onClick={connectLlm} style={btnPrimary(savingLlm||!llmKey.trim())}>
                {savingLlm ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => { setLlmExpanded(false); setLlmKey(""); }} style={btnCancel}>Cancelar</button>
            </div>
          </div>
        ))}
      </ConnectionCard>

      <ConnectionCard title="Vercel" description="Conecta Vercel para desplegar proyectos desde VForge." connected={status.vercel}>
        {!status.vercel && (!vercelExpanded ? (
          <button style={btnConfig} onClick={() => setVercelExpanded(true)}>Configurar</button>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input type="password" value={vercelToken} onChange={e => setVercelToken(e.target.value)}
              placeholder="Token de Vercel" style={inputStyle} />
            <input type="text" value={vercelTeam} onChange={e => setVercelTeam(e.target.value)}
              placeholder="Team ID (opcional)" style={inputStyle} />
            <div style={{ display:"flex", gap:8 }}>
              <button disabled={savingVercel||!vercelToken.trim()} onClick={connectVercel}
                style={btnPrimary(savingVercel||!vercelToken.trim())}>
                {savingVercel ? "Conectando..." : "Conectar"}
              </button>
              <button onClick={() => { setVercelExpanded(false); setVercelToken(""); setVercelTeam(""); }} style={btnCancel}>
                Cancelar
              </button>
            </div>
          </div>
        ))}
      </ConnectionCard>

      <ConnectionCard title="GitHub" description="Se conecta via OAuth al crear o importar un repositorio." connected={status.github}>
        {!status.github && (
          <p style={{ fontSize:12, color:T.fgMuted, margin:0 }}>Se solicitará acceso al crear tu primer proyecto.</p>
        )}
      </ConnectionCard>
    </div>
  );
}

export default ConexionesView;
