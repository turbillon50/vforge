"use client"

import Link from 'next/link'

const STACK = [
  {
    category: "Modelos de lenguaje",
    items: [
      { name: "Claude", tagline: "El agente V corre sobre Claude 3.5/4. Razonamiento, codigo y contexto largo.", url: "https://www.anthropic.com", color: "#cc785c" },
      { name: "Grok", tagline: "Modelo de xAI para razonamiento rapido e integracion con datos en tiempo real.", url: "https://x.ai", color: "#1d9bf0" },
      { name: "OpenAI", tagline: "GPT-4o y Codex para generacion de codigo, embeddings y completions.", url: "https://openai.com", color: "#10a37f" },
    ]
  },
  {
    category: "Inferencia y computo",
    items: [
      { name: "Cerebras", tagline: "Inferencia mas rapida del mundo: 1,800+ tokens/seg. Motor de velocidad de VForge.", url: "https://www.cerebras.ai", color: "#f97316" },
      { name: "Vast.ai", tagline: "GPUs on-demand para entrenamiento e inferencia pesada a costo marginal.", url: "https://vast.ai", color: "#a78bfa" },
      { name: "Hetzner", tagline: "Infraestructura europea confiable. Servidores dedicados para workloads persistentes.", url: "https://www.hetzner.com", color: "#d32f2f" },
    ]
  },
  {
    category: "Datos y memoria",
    items: [
      { name: "Hugging Face", tagline: "Hub de modelos, datasets y Spaces. Integracion directa con el pipeline de V.", url: "https://huggingface.co", color: "#fbbf24" },
      { name: "Mastra", tagline: "Framework TypeScript para orquestar agentes con memoria, tools y workflows.", url: "https://mastra.ai", color: "#60a5fa" },
      { name: "pgvector + Qdrant", tagline: "Base de datos vectorial semantica para memoria de largo plazo de los agentes.", url: "https://qdrant.tech", color: "#818cf8" },
    ]
  },
  {
    category: "Plataforma y red",
    items: [
      { name: "NGINX", tagline: "Reverse proxy y balanceador. El tejido de red que une todos los servicios de VForge.", url: "https://nginx.org", color: "#22c55e" },
    ]
  }
]

export default function Labs() {
  return (
    <section
      style={{
        padding: '80px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(167,139,250,0.35)',
            background: 'rgba(109,40,217,0.12)',
            color: '#c4b5fd',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          VForge Labs
        </span>
        <h2
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 800,
            color: '#f0f4ff',
            marginBottom: '16px',
            letterSpacing: '-0.03em',
          }}
        >
          El stack que lo hace posible
        </h2>
        <p
          style={{
            color: 'rgba(200,215,255,0.6)',
            fontSize: '1.1rem',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Cada herramienta fue elegida para maximizar velocidad, control y ahorro.
          Sin vendor lock-in. Sin sorpresas.
        </p>
      </div>

      {STACK.map((group) => (
        <div key={group.category} style={{ marginBottom: '48px' }}>
          <h3
            style={{
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(148,163,184,0.7)',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {group.category}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {group.items.map((item) => (
              <Link
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '24px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)',
                  textDecoration: 'none',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
                    }}
                  />
                  <span
                    style={{
                      color: '#f0f4ff',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  >
                    {item.name}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(148,163,184,0.5)"
                    strokeWidth="2"
                    style={{ marginLeft: 'auto', flexShrink: 0 }}
                  >
                    <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p
                  style={{
                    color: 'rgba(200,215,255,0.6)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.tagline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <Link
          href="/labs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            borderRadius: '10px',
            border: '1px solid rgba(167,139,250,0.3)',
            background: 'rgba(109,40,217,0.1)',
            color: '#c4b5fd',
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Ver Labs completo
        </Link>
      </div>
    </section>
  )
}
