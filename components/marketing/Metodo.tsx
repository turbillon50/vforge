"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

// Pipeline animation — VForge flow: code > GitHub > Vercel > deploy > artifact
const GitHubSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const VercelSVG = () => (
  <svg width="20" height="20" viewBox="0 0 76 65" fill="currentColor">
    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
  </svg>
);

const CodeSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const DeploySVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

const PIPELINE_STEPS = [
  {
    id: "code",
    label: "Codigo",
    sublabel: "Escribes con tu agente",
    icon: <CodeSVG />,
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.3)",
    detail: "Conversas con VForge. El agente genera, edita y estructura tu codigo en tiempo real.",
    tag: "VForge Brain",
  },
  {
    id: "github",
    label: "GitHub",
    sublabel: "Push automatico",
    icon: <GitHubSVG />,
    color: "#818cf8",
    glow: "rgba(129,140,248,0.3)",
    detail: "VForge hace commit y push al repositorio. Tus cambios quedan versionados al instante.",
    tag: "Git Push",
  },
  {
    id: "vercel",
    label: "Vercel",
    sublabel: "Deploy en segundos",
    icon: <VercelSVG />,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.3)",
    detail: "Cada push dispara un deployment automatico en Vercel. Preview y produccion listos.",
    tag: "CI/CD",
  },
  {
    id: "artifact",
    label: "Artifact",
    sublabel: "Producto en produccion",
    icon: <DeploySVG />,
    color: "#c4b5fd",
    glow: "rgba(196,181,253,0.3)",
    detail: "Tu producto vive. Dominio propio, HTTPS, escala sola. VForge recuerda todo el contexto.",
    tag: "Live",
  },
];

function PipelineNode({ step, index, active, onClick }: {
  step: typeof PIPELINE_STEPS[0];
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12, cursor: "pointer", flex: 1,
        transition: "transform 0.2s",
        transform: active ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      <div style={{
        width: 64, height: 64,
        background: active
          ? `radial-gradient(circle, ${step.glow} 0%, rgba(15,23,42,0.9) 70%)`
          : "rgba(15,23,42,0.8)",
        border: `1px solid ${active ? step.color : "rgba(59,130,246,0.12)"}`,
        borderRadius: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? step.color : "#475569",
        transition: "all 0.3s ease",
        boxShadow: active ? `0 0 24px ${step.glow}, 0 0 60px rgba(59,130,246,0.05)` : "none",
        backdropFilter: "blur(8px)",
      }}>
        {step.icon}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: active ? "#e2e8f0" : "#64748b", letterSpacing: "-0.01em", transition: "color 0.2s" }}>
          {step.label}
        </div>
        <div style={{ fontSize: 11, color: active ? "#94a3b8" : "#334155", letterSpacing: "0.02em", marginTop: 2, transition: "color 0.2s" }}>
          {step.sublabel}
        </div>
      </div>
    </div>
  );
}

function PipelineConnector({ active }: { active: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", flex: "0 0 60px",
      paddingBottom: 36,
    }}>
      <div style={{
        height: 1, width: "100%",
        background: active
          ? "linear-gradient(90deg, rgba(96,165,250,0.6), rgba(167,139,250,0.6))"
          : "rgba(59,130,246,0.1)",
        position: "relative",
        transition: "background 0.3s",
      }}>
        {active && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 6, height: 6, borderRadius: "50%",
            background: "rgba(167,139,250,0.8)",
            animation: "vf-pulse-dot 1.5s ease-in-out infinite",
          }}/>
        )}
      </div>
    </div>
  );
}

export function Metodo() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % PIPELINE_STEPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const step = PIPELINE_STEPS[activeStep];

  return (
    <section style={{ background: "linear-gradient(180deg, #050a14 0%, #06080f 100%)", padding: "100px 24px" }}>

      <style>{`
        @keyframes vf-pulse-dot {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes vf-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ marginBottom: 64 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#334155",
            marginBottom: 20,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(59,130,246,0.4)" }}/>
            Como funciona
          </div>
          <h2 style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 400, letterSpacing: "-0.03em",
            lineHeight: 1.1, color: "#FFFFFF",
            maxWidth: 600, marginBottom: 16,
          }}>
            El flujo que conecta todo
          </h2>
          <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.65, maxWidth: 500 }}>
            Codigo, repositorio, deployment y artifact. Un ciclo completo orquestado por VForge en una sola conversacion.
          </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", marginBottom: 64 }}/>

        {/* Pipeline visual */}
        <div style={{
          background: "rgba(8,13,26,0.8)",
          border: "1px solid rgba(59,130,246,0.1)",
          borderRadius: 20,
          padding: "48px 40px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)",
          marginBottom: 32,
        }}>
          {/* Nodes row */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
            {PIPELINE_STEPS.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < PIPELINE_STEPS.length - 1 ? "1" : "0 0 auto" }}>
                <PipelineNode step={s} index={i} active={i === activeStep} onClick={() => setActiveStep(i)} />
                {i < PIPELINE_STEPS.length - 1 && (
                  <PipelineConnector active={i === activeStep || i + 1 === activeStep} />
                )}
              </div>
            ))}
          </div>

          {/* Step detail card */}
          <div key={activeStep} style={{
            background: "rgba(15,23,42,0.7)",
            border: `1px solid ${step.color}22`,
            borderRadius: 12,
            padding: "24px 28px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: 24,
            animation: "vf-fade-up 0.3s ease",
            boxShadow: `0 0 32px ${step.glow}15`,
          }}>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
                textTransform: "uppercase", color: step.color,
                marginBottom: 8,
              }}>
                {step.tag}
              </div>
              <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
                {step.detail}
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
            }}>
              {PIPELINE_STEPS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  style={{
                    width: i === activeStep ? 20 : 6,
                    height: 6, borderRadius: 3,
                    background: i === activeStep ? step.color : "rgba(59,130,246,0.15)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Three feature cards below */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 1,
          border: "1px solid rgba(59,130,246,0.08)",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          {[
            {
              title: "Conecta tu repo en GitHub",
              desc: "Autoriza VForge con tu cuenta de GitHub. Accedemos a tus repositorios para leer codigo, generar contexto y preparar los agentes.",
              tag: "GitHub",
            },
            {
              title: "Despliega con Vercel",
              desc: "Vincula tu proyecto a Vercel. Cada push al repositorio genera un deployment automatico. VForge orquesta el ciclo completo.",
              tag: "Vercel",
            },
            {
              title: "VForge orquesta todo",
              desc: "El Brain MCP centraliza la memoria. Los agentes leen contexto, ejecutan tareas, y el Bridge conecta cada herramienta en tiempo real.",
              tag: "MCP Bridge",
            },
          ].map((card, i) => (
            <div key={i} style={{
              padding: "36px 32px",
              background: "rgba(8,13,26,0.6)",
              borderRight: i < 2 ? "1px solid rgba(59,130,246,0.08)" : "none",
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em", color: "#e2e8f0", marginBottom: 12 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, marginBottom: 20 }}>
                {card.desc}
              </p>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: "transparent", border: "1px solid rgba(59,130,246,0.15)",
                borderRadius: 9999, padding: "4px 12px",
                fontSize: 12, fontWeight: 500, color: "#60a5fa",
                letterSpacing: "-0.01em",
              }}>
                {card.tag}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(59,130,246,0.06)", marginTop: 0 }}/>

      </div>
    </section>
  );
    }
