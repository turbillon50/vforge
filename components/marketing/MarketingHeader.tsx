"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

function VForgeLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="v-hdr-g3" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="35%" stopColor="#c8c8d8"/>
          <stop offset="70%" stopColor="#888898"/>
          <stop offset="100%" stopColor="#e4e4f0"/>
        </linearGradient>
      </defs>
      <path d="M6 6 L32 58 L58 6" fill="none" stroke="url(#v-hdr-g3)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function MenuIcon({ abierto }: { abierto: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {abierto ? (
        <>
          <path d="M6 6 L18 18" />
          <path d="M18 6 L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/labs", label: "Labs" },
  { href: "/#precios", label: "Precios" },
  { href: "/blog", label: "Blog" },
  { href: "/manifiesto", label: "Manifiesto" },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // El menú se cierra al cambiar de ruta (MUST §75: atrás cierra el panel, no la página).
  useEffect(() => { setAbierto(false); }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    const alEnsanchar = () => { if (window.innerWidth >= 900) setAbierto(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", alEnsanchar);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("resize", alEnsanchar); };
  }, [abierto]);

  const headerBg = scrolled || abierto ? "rgba(5,10,20,0.97)" : "rgba(5,10,20,0.55)";

  return (
    <header className="vf-mh" style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:headerBg, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderBottom:(scrolled || abierto) ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent", transition:"background 0.3s, border-color 0.3s" }}>
      <div className="vf-mh-barra">
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:"10px", textDecoration:"none", flexShrink:0 }}>
          <VForgeLogo size={26} />
          <span style={{ color:"#f0f4ff", fontWeight:700, fontSize:"17px", letterSpacing:"-0.02em" }}>VForge</span>
        </Link>
        <nav className="vf-mh-nav" aria-label="Secciones">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} style={{ color:"rgba(200, 215, 255, 0.75)", fontWeight:500, fontSize:"14px", textDecoration:"none", padding:"6px 14px", borderRadius:"8px" }}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="vf-mh-acciones">
          <a href="https://github.com/turbillon50/vforge" target="_blank" rel="noopener noreferrer" style={{ color:"rgba(200, 215, 255, 0.8)", display:"flex", alignItems:"center" }} aria-label="GitHub">
            <GitHubIcon />
          </a>
          <Link href="/sign-in" style={{ color:"rgba(200, 215, 255, 0.8)", fontWeight:500, fontSize:"14px", textDecoration:"none", padding:"6px 14px", borderRadius:"8px" }}>
            Entrar
          </Link>
          <Link href="/sign-up" style={{ display:"inline-flex", alignItems:"center", padding:"8px 18px", borderRadius:"9px", background:"linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)", color:"#fff", fontWeight:700, fontSize:"14px", textDecoration:"none" }}>
            Empezar gratis
          </Link>
        </div>
        <button
          type="button"
          className="vf-mh-boton"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          aria-controls="vf-mh-panel"
          onClick={() => setAbierto((v) => !v)}
        >
          <MenuIcon abierto={abierto} />
        </button>
      </div>

      <div id="vf-mh-panel" className="vf-mh-panel" hidden={!abierto}>
        <nav className="vf-mh-panel-nav" aria-label="Secciones">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="vf-mh-panel-link">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="vf-mh-panel-sep" />
        <Link href="/sign-in" className="vf-mh-panel-link">Entrar</Link>
        <a href="https://github.com/turbillon50/vforge" target="_blank" rel="noopener noreferrer" className="vf-mh-panel-link vf-mh-panel-gh">
          <GitHubIcon /> GitHub
        </a>
        <Link href="/sign-up" className="vf-mh-panel-cta">Empezar gratis</Link>
      </div>

      <style>{`
        .vf-mh-barra { max-width:1200px; margin:0 auto; padding:0 24px; height:62px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .vf-mh-nav { display:flex; align-items:center; gap:4px; }
        .vf-mh-acciones { display:flex; align-items:center; gap:12px; }
        .vf-mh-boton { display:none; }
        .vf-mh-panel { display:none; }
        @media (max-width: 899px) {
          .vf-mh-barra { padding:0 16px; }
          .vf-mh-nav, .vf-mh-acciones { display:none; }
          .vf-mh-boton {
            display:inline-flex; align-items:center; justify-content:center;
            width:44px; height:44px; margin-right:-10px; padding:0;
            background:transparent; border:0; border-radius:10px;
            color:rgba(200, 215, 255, 0.85); cursor:pointer;
          }
          .vf-mh-panel {
            /* fondo opaco propio: con backdrop-filter WebKit deja ver el texto de la
               página a través del 0.97 del header (SANIDAD R-002) */
            display:block; background:#050a14;
            padding:8px 16px calc(16px + env(safe-area-inset-bottom));
            border-top:1px solid rgba(255, 255, 255, 0.08);
            max-height:calc(100dvh - 62px); overflow-y:auto; overscroll-behavior:contain;
          }
          .vf-mh-panel[hidden] { display:none; }
          .vf-mh-panel-nav { display:flex; flex-direction:column; }
          .vf-mh-panel-link {
            display:flex; align-items:center; gap:10px; min-height:44px;
            color:rgba(200, 215, 255, 0.85); font-weight:500; font-size:15px;
            text-decoration:none; padding:0 6px; border-radius:8px;
          }
          .vf-mh-panel-gh { color:rgba(200, 215, 255, 0.8); }
          .vf-mh-panel-sep { height:1px; background:rgba(255, 255, 255, 0.08); margin:8px 0; }
          .vf-mh-panel-cta {
            display:flex; align-items:center; justify-content:center; min-height:46px; margin-top:10px;
            border-radius:9px; background:linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%);
            color:#fff; font-weight:700; font-size:15px; text-decoration:none;
          }
        }
      `}</style>
    </header>
  );
}

export default MarketingHeader;
