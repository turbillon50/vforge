import Link from "next/link";
import "./auth-craft.css";

function ForgeMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * 14) / 16} viewBox="0 0 16 14" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M0 0h16L8 14z" />
    </svg>
  );
}

export function AuthSurface({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-scene">
      <div className="auth-grain" aria-hidden="true" />
      <div className="auth-aurora" aria-hidden="true" />

      <header className="auth-topbar">
        <Link href="/" className="auth-home" aria-label="VForge · Ir al inicio">
          <ForgeMark size={20} />
          <span>V<span className="auth-brand-split">/</span>FORGE</span>
        </Link>
        <span className="auth-topbar-note">DIGITAL PRODUCT FACTORY <span className="auth-topbar-slash">/</span> ACCESO</span>
        <Link href="/" className="auth-back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </Link>
      </header>

      <div className="auth-layout">
        <section className="auth-editorial" aria-label="Bienvenida a VForge">
          <div className="auth-editorial-top">
            <div className="auth-pill"><span className="auth-live-dot" /> LA FÁBRICA ESTÁ ENCENDIDA</div>
            <p className="auth-hero-kicker">CREAR, CONECTAR, LANZAR.</p>
            <h2 className="auth-hero-title">
              Las grandes<br />
              ideas merecen<br />
              <span>tomar forma.</span>
            </h2>
            <p className="auth-hero-text">
              Del primer concepto a una aplicación real. Una fábrica digital diseñada para construir, conectar y evolucionar.
            </p>
          </div>

          <div className="auth-flow" aria-label="Proceso de la fábrica">
            <div className="auth-flow-label">UN PROCESO, INFINITAS POSIBILIDADES</div>
            <div className="auth-flow-steps">
              <span><b>01</b> Imagina</span>
              <span className="auth-flow-line" aria-hidden="true" />
              <span><b>02</b> Construye</span>
              <span className="auth-flow-line" aria-hidden="true" />
              <span><b>03</b> Publica</span>
            </div>
          </div>
        </section>

        <section className="auth-stack" aria-label="Formulario de acceso">
          <div className="auth-form-eyebrow">
            <span className="auth-form-number">01 / ACCESO SEGURO</span>
            <span className="auth-form-lock">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                <rect x="3.5" y="7" width="9" height="7" rx="1.6" stroke="currentColor" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" />
              </svg>
              SESIÓN PROTEGIDA
            </span>
          </div>
          <div className="auth-intro">
            <span className="auth-eyebrow">{eyebrow}</span>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-body">{body}</p>
          </div>

          <div className="auth-card">{children}</div>

          <div className="auth-under-card">
            <span><span className="auth-under-dot" /> CONEXIÓN CIFRADA</span>
            <span>POWERED BY VFORGE</span>
          </div>
        </section>
      </div>

      <footer className="auth-footer">
        <span>VFORGE <span className="auth-brand-split">/</span> CASA LUIS</span>
        <span>IDEAS QUE SE CONVIERTEN EN PRODUCTOS.</span>
      </footer>
    </main>
  );
}
