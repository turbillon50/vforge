"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(0,0,0,0.92)" : "#000000",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: "1px solid #303236",
        transition: "background 0.2s ease",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L22 20H2L12 2Z" fill="#37C38F"/>
          </svg>
          <span style={{
            fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 600,
            letterSpacing: "-0.03em", color: "#FFFFFF",
          }}>
            VForge
          </span>
        </Link>

        {/* Nav - Desktop */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}
             className="hidden-mobile">
          {[
            { label: "Docs", href: "/developers" },
            { label: "Pricing", href: "/#pricing" },
            { label: "Blog", href: "/blog" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              color: "#A0A0A0", fontSize: 14, fontWeight: 400,
              letterSpacing: "-0.02em", padding: "8px 14px",
              borderRadius: 6, textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={e => (e.currentTarget.style.color = "#A0A0A0")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/app" style={{
            color: "#A0A0A0", fontSize: 14, fontWeight: 400,
            letterSpacing: "-0.02em", padding: "8px 14px",
            textDecoration: "none", transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
          onMouseLeave={e => (e.currentTarget.style.color = "#A0A0A0")}
          >
            Log in
          </Link>
          <Link href="/app" style={{
            background: "#FFFFFF", color: "#000000",
            fontSize: 14, fontWeight: 500,
            letterSpacing: "-0.02em",
            padding: "9px 18px", borderRadius: 9999,
            textDecoration: "none", transition: "background 0.15s",
            border: "1px solid #FFFFFF",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#E8E8E8")}
          onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
          >
            Get started
          </Link>

          {/* Hamburger - Mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none", background: "none", border: "none",
              color: "#FFFFFF", cursor: "pointer", padding: 4,
            }}
            className="show-mobile"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {menuOpen
                ? <><path d="M4 4l12 12M16 4L4 16"/></>
                : <><path d="M3 6h14M3 10h14M3 14h14"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: "#18191B", borderTop: "1px solid #303236",
          padding: "16px 24px 20px",
        }}>
          {[
            { label: "Docs", href: "/developers" },
            { label: "Pricing", href: "/#pricing" },
            { label: "Blog", href: "/blog" },
            { label: "Log in", href: "/app" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block", color: "#A0A0A0", fontSize: 16,
                padding: "12px 0", borderBottom: "1px solid #303236",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

