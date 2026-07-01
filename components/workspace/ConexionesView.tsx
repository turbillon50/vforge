"use client";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingStatus {
  llm: boolean;
  vercel: boolean;
  github: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "llm",     label: "Modelo de IA"   },
  { id: "vercel",  label: "Vercel"         },
  { id: "github",  label: "GitHub"         },
];

const LLM_PROVIDERS = [
  { id: "openai",     name: "OpenAI",      desc: "GPT-4o, GPT-4 Turbo y más"           },
  { id: "anthropic",  name: "Anthropic",   desc: "Claude 3.5 Sonnet y Haiku"           },
  { id: "groq",       name: "Groq",        desc: "Llama 3, Mixtral — inferencia rápida" },
  { id: "gemini",     name: "Google",      desc: "Gemini 1.5 Pro y Flash"              },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepDots({ status }: { status: OnboardingStatus }) {
  const done = STEPS.filter(s => status[s.id as keyof OnboardingStatus]).length;
  return (
    <div className="flex items-center gap-3 mb-8">
      {STEPS.map((s, i) => {
        const completed = status[s.id as keyof OnboardingStatus];
        const active    = !completed && i === done;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all"
              style={{
                background: completed ? "var(--color-accent)" : active ? "var(--surface-2)" : "transparent",
                border: completed ? "none" : "1px solid var(--border-1)",
                color: completed ? "#000" : active ? "var(--fg-primary)" : "var(--fg-muted)",
              }}
            >
              {completed ? "✓" : i + 1}
            </div>
            <span
              className="text-xs"
              style={{ color: completed ? "var(--fg-secondary)" : active ? "var(--fg-primary)" : "var(--fg-muted)" }}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px" style={{ background: "var(--border-1)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
      style={{
        background: connected ? "rgba(55,195,143,0.1)" : "var(--surface-2)",
        color:      connected ? "var(--color-accent)"  : "var(--fg-muted)",
        border:     connected ? "1px solid rgba(55,195,143,0.2)" : "1px solid var(--border-1)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: connected ? "var(--color-accent)" : "var(--fg-subtle)" }}
      />
      {connected ? "Conectado" : "Sin conectar"}
    </span>
  );
}

interface ConnectionCardProps {
  title:        string;
  description:  string;
  connected:    boolean;
  children?:    React.ReactNode;
}

function ConnectionCard({ title, description, connected, children }: ConnectionCardProps) {
  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background:   "var(--surface-1)",
        border:       connected ? "1px solid rgba(55,195,143,0.25)" : "1px solid var(--border-1)",
        boxShadow:    connected ? "0 0 0 1px rgba(55,195,143,0.05) inset" : "none",
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>
          {title}
        </span>
        <StatusBadge connected={connected} />
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--fg-muted)" }}>
        {description}
      </p>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ConexionesView() {
  const [status,         setStatus        ] = useState<OnboardingStatus>({ llm: false, vercel: false, github: false });
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
    setSavingVercel(true);
    setError(null);
    try {
      const r = await fetch("/api/forja/connect-vercel", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: vercelToken, teamId: vercelTeam }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error al conectar");
      setStatus(s => ({ ...s, vercel: true }));
      setVercelExpanded(false);
      setVercelToken("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingVercel(false);
    }
  }

  async function connectLlm() {
    if (!llmKey.trim()) return;
    setSavingLlm(true);
    setError(null);
    try {
      const r = await fetch("/api/forja/connect-llm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider: llmProvider, apiKey: llmKey }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error al conectar");
      setStatus(s => ({ ...s, llm: true }));
      setLlmExpanded(false);
      setLlmKey("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingLlm(false);
    }
  }

  const allDone = status.llm && status.vercel && status.github;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--border-1)", borderTopColor: "var(--color-accent)" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--fg-primary)" }}>
          Conexiones
        </h1>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          Vincula las herramientas que VForge necesita para construir y desplegar.
        </p>
      </div>

      {/* Progress dots */}
      <StepDots status={status} />

      {/* Success banner */}
      {allDone && (
        <div
          className="rounded-lg p-3 mb-6 text-sm"
          style={{
            background: "rgba(55,195,143,0.08)",
            border:     "1px solid rgba(55,195,143,0.2)",
            color:      "var(--color-accent)",
          }}
        >
          Todas las conexiones activas. Listo para construir.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="rounded-lg p-3 mb-6 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border:     "1px solid rgba(239,68,68,0.2)",
            color:      "#f87171",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">

        {/* LLM Card */}
        <ConnectionCard
          title="Modelo de IA"
          description="API key del proveedor LLM que usarán tus agentes en VForge."
          connected={status.llm}
        >
          {!status.llm && (
            <div>
              {!llmExpanded ? (
                <button
                  onClick={() => setLlmExpanded(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    color:      "var(--fg-secondary)",
                    border:     "1px solid var(--border-1)",
                  }}
                >
                  Configurar
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Provider selector */}
                  <div className="grid grid-cols-2 gap-2">
                    {LLM_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setLlmProvider(p.id)}
                        className="text-left p-2 rounded text-xs transition-all"
                        style={{
                          background: llmProvider === p.id ? "var(--surface-2)"  : "transparent",
                          border:     llmProvider === p.id ? "1px solid var(--border-2)" : "1px solid var(--border-1)",
                          color:      llmProvider === p.id ? "var(--fg-primary)"  : "var(--fg-muted)",
                        }}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div style={{ color: "var(--fg-subtle)" }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                  {/* API key input */}
                  <input
                    type="password"
                    value={llmKey}
                    onChange={e => setLlmKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 rounded text-xs font-mono outline-none transition-all"
                    style={{
                      background:    "var(--surface-2)",
                      border:        "1px solid var(--border-1)",
                      color:         "var(--fg-primary)",
                    }}
                    onKeyDown={e => e.key === "Enter" && connectLlm()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={connectLlm}
                      disabled={savingLlm || !llmKey.trim()}
                      className="text-xs font-medium px-3 py-1.5 rounded transition-all"
                      style={{
                        background: savingLlm || !llmKey.trim() ? "var(--surface-2)" : "var(--color-accent)",
                        color:      savingLlm || !llmKey.trim() ? "var(--fg-muted)"  : "#000",
                        border:     "none",
                        cursor:     savingLlm || !llmKey.trim() ? "not-allowed" : "pointer",
                      }}
                    >
                      {savingLlm ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => { setLlmExpanded(false); setLlmKey(""); }}
                      className="text-xs px-3 py-1.5 rounded"
                      style={{ color: "var(--fg-muted)", background: "transparent", border: "none" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ConnectionCard>

        {/* Vercel Card */}
        <ConnectionCard
          title="Vercel"
          description="Conecta tu cuenta de Vercel para desplegar proyectos desde VForge."
          connected={status.vercel}
        >
          {!status.vercel && (
            <div>
              {!vercelExpanded ? (
                <button
                  onClick={() => setVercelExpanded(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    color:      "var(--fg-secondary)",
                    border:     "1px solid var(--border-1)",
                  }}
                >
                  Configurar
                </button>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={e => setVercelToken(e.target.value)}
                    placeholder="Token de Vercel"
                    className="w-full px-3 py-2 rounded text-xs font-mono outline-none"
                    style={{
                      background: "var(--surface-2)",
                      border:     "1px solid var(--border-1)",
                      color:      "var(--fg-primary)",
                    }}
                  />
                  <input
                    type="text"
                    value={vercelTeam}
                    onChange={e => setVercelTeam(e.target.value)}
                    placeholder="Team ID (opcional)"
                    className="w-full px-3 py-2 rounded text-xs font-mono outline-none"
                    style={{
                      background: "var(--surface-2)",
                      border:     "1px solid var(--border-1)",
                      color:      "var(--fg-primary)",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={connectVercel}
                      disabled={savingVercel || !vercelToken.trim()}
                      className="text-xs font-medium px-3 py-1.5 rounded transition-all"
                      style={{
                        background: savingVercel || !vercelToken.trim() ? "var(--surface-2)" : "var(--color-accent)",
                        color:      savingVercel || !vercelToken.trim() ? "var(--fg-muted)"  : "#000",
                        border:     "none",
                        cursor:     savingVercel || !vercelToken.trim() ? "not-allowed" : "pointer",
                      }}
                    >
                      {savingVercel ? "Conectando..." : "Conectar"}
                    </button>
                    <button
                      onClick={() => { setVercelExpanded(false); setVercelToken(""); setVercelTeam(""); }}
                      className="text-xs px-3 py-1.5 rounded"
                      style={{ color: "var(--fg-muted)", background: "transparent", border: "none" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ConnectionCard>

        {/* GitHub Card */}
        <ConnectionCard
          title="GitHub"
          description="Repositorio de tu proyecto. Se conecta via OAuth al iniciar un proyecto."
          connected={status.github}
        >
          {!status.github && (
            <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              Se solicitará acceso al crear o importar un repositorio.
            </p>
          )}
        </ConnectionCard>

      </div>
    </div>
  );
}

export default ConexionesView;
