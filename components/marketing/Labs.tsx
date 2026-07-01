"use client";
import Link from "next/link";

// VForge Labs — el stack real que hace posible la plataforma
const STACK = [
  // Modelos de lenguaje
  {
    category: "Modelos de lenguaje",
    items: [
      {
        name: "Claude",
        tagline: "El agente V corre sobre Claude 3.5/4. Razonamiento, codigo y contexto largo.",
        url: "https://www.anthropic.com",
        color: "#cc785c",
        logo: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.3 3h-3.4L8.7 21h3.4l1.1-3.2h4.6l1.1 3.2H22L17.3 3zm-3.4 11.5L15.6 9l1.7 5.5h-3.4zM6.7 3H3.3L0 12l3.3 9h3.4L10 12 6.7 3z"/>
          </svg>
        ),
      },
      {
        name: "Grok",
        tagline: "Modelo de xAI para razonamiento rapido e integracion con datos en tiempo real.",
        url: "https://x.ai",
        color: "#1d9bf0",
        logo: (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        ),
      },
      {
        name: "OpenAI",
        tagline: "GPT-4o y Codex para generacion de codigo, embeddings y completions.",
        url: "https://openai.com",
        color: "#10a37f",
        logo: (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.28 9.28a5.998 5.998 0 00-.52-4.93 6.06 6.06 0 00-6.5-2.9A6.007 6.007 0 0010.45 0a6.065 6.065 0 00-5.78 4.2 6.003 6.003 0 00-4 2.9 6.058 6.058 0 00.74 7.1 5.998 5.998 0 00.52 4.93 6.06 6.06 0 006.5 2.9A6.007 6.007 0 0013.55 24a6.065 6.065 0 005.79-4.2 6.003 6.003 0 004-2.9 6.058 6.058 0 00-.74-7.1l-.32-.5zM13.55 22.5a4.494 4.494 0 01-2.88-1.04l.14-.08 4.79-2.77a.79.79 0 00.4-.69v-6.76l2.02 1.17a.07.07 0 01.04.05v5.6a4.515 4.515 0 01-4.51 4.52zM3.65 18.38a4.494 4.494 0 01-.54-3.02l.14.09 4.79 2.76a.79.79 0 00.79 0l5.85-3.38v2.33a.08.08 0 01-.03.06L9.76 19.9a4.51 4.51 0 01-6.11-1.52zm-1.17-10.6a4.49 4.49 0 012.35-1.97v5.67a.79.79 0 00.4.68l5.84 3.37-2.03 1.17a.07.07 0 01-.07 0L4.12 13.5a4.516 4.516 0 01-1.64-5.73zm16.63 3.86l-5.85-3.38 2.03-1.17a.07.07 0 01.07 0l4.85 2.8a4.51 4.51 0 01-.7 8.14V12.5a.79.79 0 00-.4-.68v-.18zm2.02-3.02l-.14-.09-4.79-2.76a.79.79 0 00-.79 0L9.56 9.15V6.82a.08.08 0 01.03-.06l4.89-2.82a4.51 4.51 0 016.65 4.68zM8.55 12.92L6.53 11.75a.07.07 0 01-.04-.05V6.1a4.51 4.51 0 017.39-3.46l-.14.08-4.79 2.77a.79.79 0 00-.4.69v6.74zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z"/>
          </svg>
        ),
      },
      {
        name: "Cerebras",
        tagline: "Inferencia ultrarapida — 1,800+ tokens/seg. El motor de velocidad de VForge.",
        url: "https://www.cerebras.ai",
        color: "#ff6b35",
        logo: (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"/>
            <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.6"/>
            <circle cx="50" cy="20" r="8" fill="currentColor"/>
            <circle cx="50" cy="80" r="8" fill="currentColor"/>
            <circle cx="20" cy="50" r="8" fill="currentColor"/>
            <circle cx="80" cy="50" r="8" fill="currentColor"/>
          </svg>
        ),
      },
    ],
  },
  // Compute e infra
  {
    category: "Compute e infraestructura",
    items: [
      {
        name: "Vast.ai",
        tagline: "GPUs on-demand para entrenamiento, fine-tuning y cargas intensivas de inferencia.",
        url: "https://vast.ai",
        color: "#7c3aed",
        logo: (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="3" width="20" height="4" rx="1"/>
            <rect x="2" y="10" width="20" height="4" rx="1"/>
            <rect x="2" y="17" width="20" height="4" rx="1"/>
            <circle cx="19" cy="5" r="1.5" fill="#7c3aed"/>
            <circle cx="19" cy="12" r="1.5" fill="#7c3aed"/>
            <circle cx="19" cy="19" r="1.5" fill="#7c3aed"/>
          </svg>
        ),
      },
      {
        name: "Hetzner",
        tagline: "Servidores dedicados europeos de alta densidad. Precio/performance imbatible.",
        url: "https://www.hetzner.com",
        color: "#d50c2d",
        logo: (
          <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
            <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"/>
          </svg>
        ),
      },
      {
        name: "NGINX",
        tagline: "Proxy inverso, balanceo de carga y gateway de alto rendimiento para el Bridge MCP.",
        url: "https://nginx.org",
        color: "#009639",
        logo: (
          <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
            <polygon points="50,5 95,95 5,95" fill="none" stroke="currentColor" strokeWidth="8"/>
            <text x="50" y="78" textAnchor="middle" fontSize="36" fontWeight="bold" fill="currentColor">N</text>
          </svg>
        ),
      },
    ],
  },
  // IA y orquestacion
  {
    category: "IA y orquestacion",
    items: [
      {
        name: "Hugging Face",
        tagline: "Hub de modelos abiertos, datasets y Spaces. Acceso al ecosistema open-source de IA.",
        url: "https://huggingface.co",
        color: "#ff9d00",
        logo: (
          <svg width="28" height="28" viewBox="0 0 120 120" fill="currentColor">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8"/>
            <ellipse cx="42" cy="55" rx="8" ry="10"/>
            <ellipse cx="78" cy="55" rx="8" ry="10"/>
            <path d="M38 75 Q60 90 82 75" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
            <circle cx="42" cy="32" r="6"/>
            <circle cx="78" cy="32" r="6"/>
          </svg>
        ),
      },
      {
        name: "Mastra",
        tagline: "Framework de orquestacion de agentes. Define flujos, herramientas y memoria persistente.",
        url: "https://mastra.ai",
        color: "#6366f1",
        logo: (
          <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
            <rect x="10" y="10" width="35" height="35" rx="6"/>
            <rect x="55" y="10" width="35" height="35" rx="6" opacity="0.7"/>
            <rect x="10" y="55" width="35" height="35" rx="6" opacity="0.7"/>
            <rect x="55" y="55" width="35" height="35" rx="6" opacity="0.4"/>
          </svg>
        ),
      },
    ],
  },
  // Data vectorial
  {
    category: "Base de datos semantica y vectorial",
    items: [
      {
        name: "pgvector",
        tagline: "Extension vectorial sobre PostgreSQL. Busqueda semantica nativa en la base de datos.",
        url: "https://github.com/pgvector/pgvector",
        color: "#336791",
        logo: (
          <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
            <ellipse cx="50" cy="25" rx="38" ry="15"/>
            <rect x="12" y="25" width="76" height="50" fill="none" stroke="currentColor" strokeWidth="8"/>
            <ellipse cx="50" cy="75" rx="38" ry="15"/>
          </svg>
        ),
      },
      {
        name: "Qdrant",
        tagline: "Motor vectorial de alta velocidad para recuperacion semantica y memoria de agentes.",
        url: "https://qdrant.tech",
        color: "#dc143c",
        logo: (
          <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
            <polygon points="50,5 95,50 50,95 5,50"/>
            <polygon points="50,25 75,50 50,75 25,50" opacity="0.5"/>
          </svg>
        ),
      },
      {
        name: "Neon DB",
        tagline: "PostgreSQL serverless con branching. La base de datos que escala con tu producto.",
        url: "https://neon.tech",
        color: "#00e5bf",
        logo: (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#00e5bf" opacity="0.15"/>
            <path d="M6 8h5l-1 4h4l-5 4 1-4H6V8z" fill="#00e5bf"/>
          </svg>
        ),
      },
    ],
  },
];

export function Labs() {
  return (
    <section style={{
      background: "linear-gradient(180deg, #03060e 0%, #050a14 50%, #03060e 100%)",
      padding: "100px 24px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 900, height: 500, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, rgba(124,58,237,0.03) 50%, transparent 70%)",
        filter: "blur(80px)", pointerEvents: "none",
      }}/>

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 72, maxWidth: 680 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#3b82f6",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "rgba(59,130,246,0.5)" }}/>
            VForge Labs
          </div>
          <h2 style={{
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            fontWeight: 600, letterSpacing: "-0.04em",
            lineHeight: 1.06, color: "#FFFFFF", marginBottom: 20,
          }}>
            El stack real que{" "}
            <span style={{
              background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              hace posible VForge
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.7, maxWidth: 560 }}>
            No usamos solo lo de siempre. Cada herramienta fue elegida por rendimiento, eficiencia y ventaja tecnica real. Esto es lo que corre detras de cada conversacion.
          </p>
        </div>

        {/* Stack categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
          {STACK.map(group => (
            <div key={group.category}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "#334155",
                marginBottom: 24, paddingBottom: 12,
                borderBottom: "1px solid rgba(59,130,246,0.08)",
              }}>
                {group.category}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}>
                {group.items.map(item => (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      background: "rgba(8,13,26,0.8)",
                      border: "1px solid rgba(59,130,246,0.08)",
                      borderRadius: 14,
                      padding: "24px",
                      textDecoration: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                      backdropFilter: "blur(8px)",
                    }}
                    onMouseEnter={e => {
                      const t = e.currentTarget as HTMLAnchorElement;
                      t.style.borderColor = `${item.color}40`;
                      t.style.boxShadow = `0 0 32px ${item.color}15, 0 4px 24px rgba(0,0,0,0.3)`;
                      t.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      const t = e.currentTarget as HTMLAnchorElement;
                      t.style.borderColor = "rgba(59,130,246,0.08)";
                      t.style.boxShadow = "none";
                      t.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `${item.color}12`,
                        border: `1px solid ${item.color}25`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: item.color, flexShrink: 0,
                      }}>
                        {item.logo}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11, color: item.color, letterSpacing: "0.04em", marginTop: 2 }}>
                          {item.url.replace("https://", "").replace("www.", "")}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.65, margin: 0 }}>
                      {item.tagline}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div style={{
          marginTop: 80, padding: "32px", textAlign: "center",
          background: "rgba(8,13,26,0.6)",
          border: "1px solid rgba(59,130,246,0.08)",
          borderRadius: 16,
        }}>
          <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Este stack esta en constante evolucion. Evaluamos nuevas tecnologias continuamente y adoptamos las que dan ventaja real a nuestros usuarios.
            Si trabajas en una de estas herramientas o quieres integrarte, escríbenos.
          </p>
          <a href="mailto:labs@vforge.site" style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginTop: 20,
            color: "#60a5fa", fontSize: 14, textDecoration: "none",
            letterSpacing: "-0.01em", transition: "color 0.15s",
          }}>
            labs@vforge.site →
          </a>
        </div>

      </div>
    </section>
  );
              }
