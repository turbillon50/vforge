"use client"

import Link from 'next/link'

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: '#050a14',
      }}
    >
      {/* Waves background image — animated slow drift */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          backgroundImage: 'url(/hero/hero-waves.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'wavesDrift 20s ease-in-out infinite alternate',
          zIndex: 0,
        }}
      />

      {/* Subtle dark gradient overlay — just enough for readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(5,10,20,0.82) 0%, rgba(5,10,20,0.55) 50%, rgba(5,10,20,0.78) 100%)',
          zIndex: 1,
        }}
      />

      {/* Bottom fade so hero blends into next section */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '180px',
          background: 'linear-gradient(to top, #050a14 0%, transparent 100%)',
          zIndex: 2,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          paddingTop: '96px',
          paddingBottom: '120px',
          width: '100%',
        }}
      >
        {/* Badge */}
        <div style={{ marginBottom: '28px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(96,165,250,0.35)',
              background: 'rgba(59,130,246,0.12)',
              color: '#93c5fd',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#60a5fa',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }}
            />
            Plataforma MCP — Beta abierta
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.6rem, 6vw, 5rem)',
            fontWeight: 800,
            lineHeight: 1.08,
            marginBottom: '28px',
            letterSpacing: '-0.03em',
            maxWidth: '780px',
          }}
        >
          <span style={{ color: '#f0f4ff' }}>La conexion vital entre</span>
          <br />
          <span
            style={{
              background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 60%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Git, Vercel y tus agentes
          </span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'rgba(200,215,255,0.78)',
            maxWidth: '560px',
            lineHeight: 1.65,
            marginBottom: '48px',
          }}
        >
          VForge conecta tus repositorios, deployments y modelos de IA en un
          solo flujo. Construye, despliega y automatiza con el poder del
          protocolo MCP.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            href="/app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(96,165,250,0.28)',
              transition: 'opacity 0.2s',
            }}
          >
            Empieza gratis
          </Link>
          <Link
            href="/labs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 32px',
              borderRadius: '10px',
              border: '1px solid rgba(167,139,250,0.4)',
              background: 'rgba(109,40,217,0.12)',
              color: '#c4b5fd',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            Ver stack tecnico
          </Link>
        </div>

        {/* Feature tags */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '56px',
          }}
        >
          {[
            'Brain Memory',
            'MCP Stateless',
            'GitHub Sync',
            'Vercel Deploy',
            'Cerebras 1800 tok/s',
            'Vast.ai GPU',
          ].map((tag) => (
            <span
              key={tag}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(96,165,250,0.2)',
                background: 'rgba(59,130,246,0.08)',
                color: 'rgba(147,197,253,0.85)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes wavesDrift {
          0%   { transform: scale(1.05) translate(0px, 0px); }
          25%  { transform: scale(1.08) translate(-12px, -8px); }
          50%  { transform: scale(1.06) translate(8px, 12px); }
          75%  { transform: scale(1.09) translate(-6px, 6px); }
          100% { transform: scale(1.05) translate(10px, -10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </section>
  )
}
