"use client"

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function Hero() {
  const bgRef = useRef(null)

  useEffect(() => {
    const el = bgRef.current
    if (!el) return
    let start = null
    let rafId
    const animate = (ts) => {
      if (!start) start = ts
      const t = (ts - start) / 1000
      const x = Math.sin(t * 0.3) * 12
      const y = Math.cos(t * 0.25) * 8
      const s = 1.06 + Math.sin(t * 0.2) * 0.03
      el.style.transform = 'scale(' + s + ') translate(' + x + 'px, ' + y + 'px)'
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

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
      {/* Waves background — animated via RAF */}
      <div
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: '-10%',
          backgroundImage: 'url(/hero/hero-waves.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          willChange: 'transform',
          zIndex: 0,
        }}
      />

      {/* Dark overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(5,10,20,0.88) 0%, rgba(5,10,20,0.6) 50%, rgba(5,10,20,0.85) 100%)',
          zIndex: 1,
        }}
      />

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '160px',
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
          padding: '96px 24px 120px',
          width: '100%',
        }}
      >
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
              }}
            />
            Plataforma MCP — Beta abierta
          </span>
        </div>

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

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'rgba(200,215,255,0.75)',
            maxWidth: '560px',
            lineHeight: 1.65,
            marginBottom: '48px',
          }}
        >
          VForge conecta tus repositorios, deployments y modelos de IA en un
          solo flujo. Construye, despliega y automatiza con el poder del
          protocolo MCP.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            href="/app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(96,165,250,0.25)',
            }}
          >
            Empieza gratis
          </Link>
          <Link
            href="/labs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 32px',
              borderRadius: '10px',
              border: '1px solid rgba(167,139,250,0.4)',
              background: 'rgba(109,40,217,0.12)',
              color: '#c4b5fd',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Ver stack tecnico
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '56px',
          }}
        >
          {['Brain Memory', 'MCP Stateless', 'GitHub Sync', 'Vercel Deploy', 'Cerebras 1800 tok/s', 'Vast.ai GPU'].map((tag) => (
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
    </section>
  )
}
