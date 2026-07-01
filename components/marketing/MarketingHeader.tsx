"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

function VForgeLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="v-metal-hdr" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="35%" stopColor="#c8c8d8"/>
          <stop offset="70%" stopColor="#888898"/>
          <stop offset="100%" stopColor="#e4e4f0"/>
        </linearGradient>
      </defs>
      <path d="M6 6 L32 58 L58 6" fill="none" stroke="url(#v-metal-hdr)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const GitHubIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const NAV = [
  { label: "Labs", href: "/labs" },
  { label: "Precios", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Manifiesto", href: "/manifiesto" },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled
        ? "rgba(5,10,20,0.94)"
        : "linear-gradient(180deg, rgba(5,10,20,0.98) 0%, rgba(5,10,20,0.8) 100%)",
      backdropFilter: scrolled ? "blur(20px) saturate(1.6)" : "blur(8px)",
      WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.6)" : "blur(8px)",
      borderBottom: scrolled
        ? "1px solid rgba(59,130,246,0.14)"
        : "1px solid rgba(59,130,246,0.06)",
      boxShadow: scrolled
        ? "0 1px 48px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(59,130,246,0.08), 0 4px 24px rgba(59,130,246,0.04)"
        : "none",
      transition: "all 0.35s ease",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 62, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <VForgeLogo size={26} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "-0.04em", color: "#FFFFFF" }}>
            VForge
          </span>
        </Link>

        {/* Nav desktop */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="vf-hidden-mobile">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={{
              color: "#64748b", fontSize: 14, fontWeight: 400,
              letterSpacing: "-0.02em", padding: "8px 14px",
              borderRadius: 6, textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="https://github.com/turbillon50/vforge" target="_blank" rel="noopener noreferrer" title="Repositorio GitHub"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34,
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(59,130,246,0.15)",
              borderRadius: 7, color: "#64748b",
              textDecoration: "none", transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              const t = e.currentTarget as HTMLAnchorElement;
              t.style.borderColor = "rgba(96,165,250,0.5)";
              t.style.color = "#e2e8f0";
              t.style.boxShadow = "0 0 10px rgba(59,130,246,0.15)";
            }}
            onMouseLeave={e => {
              const t = e.currentTarget as HTMLAnchorElement;
              t.style.borderColor = "rgba(59,130,246,0.15)";
              t.style.color = "#64748b";
              t.style.boxShadow = "none";
            }}
          >
            <GitHubIcon />
          </a>

          <Link href="/app" style={{
            color: "#64748b", fontSize: 14, fontWeight: 400,
            letterSpacing: "-0.02em", padding: "8px 14px",
            textDecoration: "none", transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          className="vf-hidden-mobile"
          >
            Log in
          </Link>

          <Link href="/app" style={{
            background: "linear-gradient(135deg, #3b82f6, #6d28d9)",
            color: "#ffffff", fontSize: 14, fontWeight: 600,
            letterSpacing: "-0.02em",
            padding: "9px 20px", borderRadius: 9999,
            textDecoration: "none",
            boxShadow: "0 0 18px rgba(59,130,246,0.28)",
            transition: "box-shadow 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 28px rgba(59,130,246,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 18px rgba(59,130,246,0.28)")}
          >
            Get started
          </Link>

          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "none", background: "none", border: "none", color: "#e2e8f0", cursor: "pointer", padding: 4 }}
            className="vf-show-mobile" aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {menuOpen ? <><path d="M4 4l12 12M16 4L4 16"/></> : <><path d="M3 6h14M3 10h14M3 14h14"/></>}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{
          background: "rgba(5,10,20,0.98)", borderTop: "1px solid rgba(59,130,246,0.1)",
          padding: "16px 24px 20px", backdropFilter: "blur(16px)",
        }}>
          {[...NAV, { label: "Log in", href: "/app" }].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
              style={{ display: "block", color: "#64748b", fontSize: 16, padding: "12px 0", borderBottom: "1px solid rgba(59,130,246,0.08)", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .vf-hidden-mobile { display: none !important; }
          .vf-show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
                            }

export default MarketingHeader;
