import Link from "next/link";
import "./auth-craft.css";

/* Marca VForge: triángulo invertido relleno (coherente con la landing) */
function ForgeMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={(size * 14) / 16}
      viewBox="0 0 16 14"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
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
      <ForgeMark size={460} className="auth-ember" />

      <div className="auth-stack">
        <Link href="/" className="auth-back">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </Link>

        <div className="auth-brand">
          <ForgeMark size={18} />
          <span className="wm">Forge</span>
        </div>

        <p className="auth-eyebrow">{eyebrow}</p>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-body">{body}</p>

        <div className="auth-card">{children}</div>
      </div>
    </main>
  );
}
