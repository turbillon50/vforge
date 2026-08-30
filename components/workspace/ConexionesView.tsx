"use client";
import { useEffect, useState } from "react";

interface OnboardingStatus {
  llm: boolean;
  vercel: boolean;
  github: boolean;
}

const STEPS = [
  { id: "llm", label: "Modelo de IA" },
  { id: "vercel", label: "Vercel" },
  { id: "github", label: "GitHub" },
];

const LLM_PROVIDERS = [
  { id: "openai", name: "OpenAI", desc: "GPT‑4o, GPT‑4 Turbo" },
  { id: "anthropic", name: "Anthropic", desc: "Claude 3.5 Sonnet" },
  { id: "groq", name: "Groq", desc: "Llama 3 — rápido" },
  { id: "gemini", name: "Google", desc: "Gemini 1.5 Pro" },
];

function StepDots({ status }: { status: OnboardingStatus }) {
  const done = STEPS.filter((s) => status[s.id as keyof OnboardingStatus]).length;
  return (
    <div className="flex items-center gap-3 mb-7">
      {STEPS.map((s, i) => {
        const completed = status[s.id as keyof OnboardingStatus];
        const active = !completed && i === done;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold
                ${completed ? "bg-black text-white" : "bg-transparent"}
                ${
                  !completed
                    ? `border border-[var(--border-1)] ${active ? "text-[var(--color-ink)]" : "text-[var(--fg-secondary)]"}`
                    : ""
                }`}
            >
              {completed ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs ${
                completed
                  ? "text-[var(--fg-secondary)]"
                  : active
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--fg-secondary)]"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-[var(--border-1)]" />}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium
        ${
          connected
            ? "bg-green-100 border-green-200 text-green-600"
            : "bg-white border-[var(--border-1)] text-[var(--fg-secondary)]"
        }`}
    >
      <span className={`block h-1 w-1 rounded-full ${connected ? "bg-green-600" : "bg-[var(--fg-secondary)]"}`} />
      {connected ? "Conectado" : "Sin conectar"}
    </span>
  );
}

interface CardProps {
  title: string;
  description: string;
  connected: boolean;
  children?: React.ReactNode;
}
function ConnectionCard({ title, description, connected, children }: CardProps) {
  return (
    <div
      className={`rounded-lg p-4 mb-2 border ${connected ? "bg-white" : "bg-white"} border-[var(--border-1)]`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-semibold text-[var(--color-ink)]">{title}</span>
        <StatusBadge connected={connected} />
      </div>
      <p className="text-xs text-[var(--fg-secondary)] mb-3">{description}</p>
      {children}
    </div>
  );
}

export function ConexionesView() {
  const [status, setStatus] = useState<OnboardingStatus>({ llm: false, vercel: false, github: false });
  const [loading, setLoading] = useState(true);
  const [vercelToken, setVercelToken] = useState("");
  const [vercelTeam, setVercelTeam] = useState("");
  const [savingVercel, setSavingVercel] = useState(false);
  const [vercelExpanded, setVercelExpanded] = useState(false);
  const [llmKey, setLlmKey] = useState("");
  const [llmProvider, setLlmProvider] = useState("openai");
  const [savingLlm, setSavingLlm] = useState(false);
  const [llmExpanded, setLlmExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then((d) => {
        const connected = Array.isArray(d?.connected) ? d.connected : [];
        setStatus({
          llm: connected.includes("llm"),
          vercel: connected.includes("vercel"),
          github: connected.includes("github"),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function connectVercel() {
    if (!vercelToken.trim()) return;
    setSavingVercel(true);
    setError(null);
    try {
      const r = await fetch("/api/forja/connect-vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vercelToken, teamId: vercelTeam }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      setStatus((s) => ({ ...s, vercel: true }));
      setVercelExpanded(false);
      setVercelToken("");
      setVercelTeam("");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: llmProvider, apiKey: llmKey }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Error");
      setStatus((s) => ({ ...s, llm: true }));
      setLlmExpanded(false);
      setLlmKey("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSavingLlm(false);
    }
  }

  const inputClass =
    "w-full rounded-md px-3 py-2 bg-white border border-[var(--border-1)] text-sm text-[var(--color-ink)] focus:outline-none";

  const btnPrimary = (disabled: boolean) =>
    `px-4 py-2 rounded-md text-sm font-medium ${disabled ? "bg-white text-[var(--fg-secondary)] cursor-not-allowed border border-[var(--border-1)]" : "bg-black text-white hover:bg-[var(--border-1)]"} `;

  const btnGhost = (disabled: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium ${disabled ? "bg-white text-[var(--fg-secondary)] cursor-not-allowed border border-[var(--border-1)]" : "bg-white text-[var(--color-ink)] border border-[var(--border-1)] hover:bg-[var(--border-1)]"} `;

  const btnConfig = "px-3 py-2 rounded-md text-sm font-medium bg-white text-[var(--color-ink)] border border-[var(--border-1)] hover:bg-[var(--border-1)]";

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-black" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8 bg-white">
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">Conexiones</h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          Vincula las herramientas que VForge necesita para construir y desplegar.
        </p>
      </div>

      <StepDots status={status} />

      {status.llm && status.vercel && status.github && (
        <div className="mb-4 rounded-md bg-green-100 border border-green-200 p-2 text-sm text-green-600">
          ✓ Todas las conexiones activas. Listo para construir.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-100 border border-red-200 p-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <ConnectionCard
        title="Modelo de IA"
        description="API key del proveedor LLM para tus agentes."
        connected={status.llm}
      >
        {!status.llm && (
          <>
            {!llmExpanded ? (
              <button className={btnConfig} onClick={() => setLlmExpanded(true)}>
                Configurar
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {LLM_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setLlmProvider(p.id)}
                      className={`text-left rounded-md px-2 py-2 text-xs border ${
                        llmProvider === p.id
                          ? "bg-white border-[var(--border-1)] text-[var(--color-ink)]"
                          : "border-[var(--border-1)] text-[var(--fg-secondary)]"
                      }`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-[var(--fg-secondary)]">{p.desc}</div>
                    </button>
                  ))}
                </div>
                <input
                  type="password"
                  value={llmKey}
                  onChange={(e) => setLlmKey(e.target.value)}
                  placeholder="sk-..."
                  className={inputClass}
                  onKeyDown={(e) => e.key === "Enter" && connectLlm()}
                />
                <div className="flex gap-2">
                  <button
                    disabled={savingLlm || !llmKey.trim()}
                    className={btnPrimary(savingLlm || !llmKey.trim())}
                    onClick={connectLlm}
                  >
                    {savingLlm ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    className={btnGhost(false)}
                    onClick={() => {
                      setLlmExpanded(false);
                      setLlmKey("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </ConnectionCard>

      <ConnectionCard
        title="Vercel"
        description="Conecta Vercel para desplegar proyectos desde VForge."
        connected={status.vercel}
      >
        {!status.vercel && (
          <>
            {!vercelExpanded ? (
              <button className={btnConfig} onClick={() => setVercelExpanded(true)}>
                Configurar
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="password"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  placeholder="Token de Vercel"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={vercelTeam}
                  onChange={(e) => setVercelTeam(e.target.value)}
                  placeholder="Team ID (opcional)"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    disabled={savingVercel || !vercelToken.trim()}
                    className={btnPrimary(savingVercel || !vercelToken.trim())}
                    onClick={connectVercel}
                  >
                    {savingVercel ? "Conectando…" : "Conectar"}
                  </button>
                  <button
                    className={btnGhost(false)}
                    onClick={() => {
                      setVercelExpanded(false);
                      setVercelToken("");
                      setVercelTeam("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </ConnectionCard>

      <ConnectionCard
        title="GitHub"
        description="Se conecta vía OAuth al crear o importar un repositorio."
        connected={status.github}
      >
        {!status.github && (
          <p className="text-xs text-[var(--fg-secondary)]">
            Se solicitará acceso al crear tu primer proyecto.
          </p>
        )}
      </ConnectionCard>
    </div>
  );
}