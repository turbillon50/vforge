"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./monochrome-home.css";

/* Logo aprobado VForge: triángulo invertido relleno */
function ForgeMark({ size = 19, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 14" width={size} height={(size * 14) / 16} aria-hidden="true" className={className}>
      <path d="M0 0h16L8 14z" fill="currentColor" />
    </svg>
  );
}

/* Logos oficiales de marca (Simple Icons, 24x24, monocromo) */
const BRAND_PATHS: Record<string, string> = {
  GitHub: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  Vercel: "m12 1.608 12 20.784H0Z",
  Neon: "M24 0V24l-9.365-8.045V24H0V0ZM2.942 21.087h8.751V9.563l9.365 8.204V2.919L2.942 2.914Z",
  Clerk: "m21.47 20.829-2.881-2.881a.572.572 0 0 0-.7-.084 6.854 6.854 0 0 1-7.081 0 .576.576 0 0 0-.7.084l-2.881 2.881a.576.576 0 0 0-.103.69.57.57 0 0 0 .166.186 12 12 0 0 0 14.113 0 .58.58 0 0 0 .239-.423.576.576 0 0 0-.172-.453Zm.002-17.668-2.88 2.88a.569.569 0 0 1-.701.084A6.857 6.857 0 0 0 8.724 8.08a6.862 6.862 0 0 0-1.222 3.692 6.86 6.86 0 0 0 .978 3.764.573.573 0 0 1-.083.699l-2.881 2.88a.567.567 0 0 1-.864-.063A11.993 11.993 0 0 1 6.771 2.7a11.99 11.99 0 0 1 14.637-.405.566.566 0 0 1 .232.418.57.57 0 0 1-.168.448Zm-7.118 12.261a3.427 3.427 0 1 0 0-6.854 3.427 3.427 0 0 0 0 6.854Z",
  Stripe: "M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z",
  MCP: "M13.85 0a4.16 4.16 0 0 0-2.95 1.217L1.456 10.66a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l9.442-9.442a2.49 2.49 0 0 1 3.541 0 2.49 2.49 0 0 1 0 3.541L8.59 12.97l-.1.1a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l.1-.098 7.03-7.034a2.49 2.49 0 0 1 3.542 0l.049.05a2.49 2.49 0 0 1 0 3.54l-8.54 8.54a1.96 1.96 0 0 0 0 2.755l1.753 1.753a.835.835 0 0 0 1.18 0 .835.835 0 0 0 0-1.18l-1.753-1.753a.266.266 0 0 1 0-.394l8.54-8.54a4.185 4.185 0 0 0 0-5.9l-.05-.05a4.16 4.16 0 0 0-2.95-1.218c-.2 0-.401.02-.6.048a4.17 4.17 0 0 0-1.17-3.552A4.16 4.16 0 0 0 13.85 0m0 3.333a.84.84 0 0 0-.59.245L6.275 10.56a4.186 4.186 0 0 0 0 5.902 4.186 4.186 0 0 0 5.902 0L19.16 9.48a.835.835 0 0 0 0-1.18.835.835 0 0 0-1.18 0l-6.985 6.984a2.49 2.49 0 0 1-3.54 0 2.49 2.49 0 0 1 0-3.54l6.983-6.985a.835.835 0 0 0 0-1.18.84.84 0 0 0-.59-.245",
};
function BrandMark({ name, size = 20 }: { name: string; size?: number }) {
  const d = BRAND_PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function MindContextMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.25a4.2 4.2 0 0 0-4.1 3.3 3.35 3.35 0 0 0-1.13 6.45 3.64 3.64 0 0 0 4.32 5.33 3.04 3.04 0 0 0 5.5-1.8 3.52 3.52 0 0 0 .7-6.65A4.18 4.18 0 0 0 12 3.25Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.1 9.35h5.8M8.75 13h6.5M11.1 16.45h2.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SearchMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m20 20-4.6-4.6M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function MicMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 14.5a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5.5a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 11.5a7 7 0 0 1-14 0M12 18.5V22M8.5 22h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/* Logo oficial de GitHub (Octocat mark) */
function GitHubMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 98 96" width={size} height={size} aria-hidden="true" className={className}>
      <path
        fill="#fff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

/* Logo oficial de Vercel (triángulo) */
function VercelMark({ size = 38, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 76 65" width={size} height={(size * 65) / 76} aria-hidden="true" className={className}>
      <path fill="#fff" d="M37.527 0 75.054 65H0z" />
    </svg>
  );
}

const onboardingButtons = [
  { name: "GitHub", mobileName: "GitHub", caption: "Repos", icon: <BrandMark name="GitHub" size={18} /> },
  { name: "Vercel", mobileName: "Vercel", caption: "Deploys", icon: <BrandMark name="Vercel" size={18} /> },
  { name: "Mind Context", mobileName: "Mind\nContext", caption: "Fuentes", icon: <MindContextMark size={18} /> },
  { name: "MCPs", mobileName: "MCPs", caption: "Fábrica", icon: <BrandMark name="MCP" size={18} /> },
];

const footerColumns = [
  { title: "Producto", items: ["Chat", "Marketplace", "Propuestas", "Previews"] },
  { title: "Conectores", items: ["GitHub", "Vercel", "Mind Context", "MCPs"] },
  { title: "Operación", items: ["Trama", "Lutor", "Dominios", "Facturación"] },
  { title: "Compañía", items: ["Documentación", "Soporte", "Privacidad", "Términos"] },
];

/* Marca el dispositivo la primera vez que se ve el splash. localStorage, no sessionStorage:
   "visitas repetidas" es por aparato, no por pestaña. */
const SPLASH_KEY = "vf-portada-splash-v1";

/* Corre ANTES de que el navegador pinte el splash (script en línea, antes del div en el DOM):
   si ya se vio, marca <html> y el CSS lo esconde sin un solo frame negro. Si localStorage está
   bloqueado (Safari privado), no marca nada y el splash sale: nunca rompe la portada. */
const GATE_JS =
  "(function(){try{if(localStorage.getItem('" +
  SPLASH_KEY +
  "')){document.documentElement.setAttribute('data-vf-splash','off');}else{localStorage.setItem('" +
  SPLASH_KEY +
  "','1');}}catch(e){}})();";

export function MonochromeHome() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const splash = document.getElementById("fx-splash");
    const main = document.getElementById("fx-main");
    const hdr = document.getElementById("fx-hdr");
    /* MUST-500 §2: el splash nunca pasa de 3 s. 2.35 s + .45 s de salida = 2.8 s.
       La secuencia termina en 2.2 s (cimientos 1.55 s, "nace" 2.2 s), así que no se corta. */
    const yaVisto =
      document.documentElement.getAttribute("data-vf-splash") === "off";
    const DUR = yaVisto ? 0 : 2350;
    let done = false;
    let io: IntersectionObserver | null = null;

    function startReveal() {
      // Marca que el observador SÍ quedó enganchado. Mientras no esté esta marca,
      // el CSS mantiene su red de seguridad de 3 s (ver monochrome-home.css).
      document.documentElement.setAttribute("data-vf-reveal", "js");
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) e.target.classList.add("in");
          });
        },
        { threshold: 0.12 }
      );
      document.querySelectorAll(".fx-reveal").forEach((el) => io!.observe(el));
    }

    function finish() {
      if (done) return;
      done = true;
      splash?.classList.add("gone");
      main?.classList.add("live");
      startReveal();
    }

    const timer = window.setTimeout(finish, DUR);
    const onSkip = () => {
      window.clearTimeout(timer);
      finish();
    };
    splash?.addEventListener("click", onSkip);

    const onScroll = () => {
      if (window.scrollY > 20) hdr?.classList.add("stuck");
      else hdr?.classList.remove("stuck");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      splash?.removeEventListener("click", onSkip);
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 820) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  const navLinks = [
    { href: "#flujo", label: "Flujo" },
    { href: "#incluye", label: "Qué incluye" },
    { href: "#integraciones", label: "Conectores" },
    { href: "#footer", label: "Mapa" },
  ];

  return (
    <div className="fx-root">
      {/* Antes del splash en el DOM: decide si esta visita lo merece, sin que alcance a pintarse. */}
      <script dangerouslySetInnerHTML={{ __html: GATE_JS }} />

      {/* ===== SPLASH ===== */}
      <div id="fx-splash" className="fx-splash">
        <div className="fx-seq">
          {/* dos cimientos: GitHub + Vercel */}
          <div className="fx-cimientos">
            <span className="fx-b fx-b-gh"><GitHubMark size={40} /></span>
            <span className="fx-b fx-b-vc"><VercelMark size={40} /></span>
          </div>
          {/* nace VForge */}
          <div className="fx-nace">
            <ForgeMark size={38} className="fx-tri" />
            <span className="fx-word">Forge</span>
          </div>
        </div>
        <div className="fx-skip">Toca para saltar</div>
      </div>
      {/* Corre antes de hidratar: el toque siempre salta el splash aunque React no llegue. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var s=document.getElementById('fx-splash'),m=document.getElementById('fx-main');if(!s)return;s.addEventListener('click',function(){s.classList.add('gone');if(m)m.classList.add('live');},{once:true});})();",
        }}
      />

      {/* ===== HEADER ===== */}
      <header id="fx-hdr" className={`fx-hdr${menuOpen ? " open" : ""}`}>
        <div className="fx-brand"><ForgeMark size={22} /><span className="name">Forge</span></div>
        <nav className="fx-links">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <div className="fx-navcta">
          <Link className="fx-pill ghost" href="/sign-in">Entrar</Link>
          <Link className="fx-pill solid" href="/sign-up">Empezar gratis</Link>
        </div>
        <button
          type="button"
          className="fx-menu-btn"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="fx-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div id="fx-mobile-menu" className="fx-mobile-panel" hidden={!menuOpen}>
          <nav aria-label="Navegación móvil">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="fx-mobile-actions">
            <Link className="fx-pill ghost" href="/sign-in" onClick={() => setMenuOpen(false)}>Entrar</Link>
            <Link className="fx-pill solid" href="/sign-up" onClick={() => setMenuOpen(false)}>Empezar gratis</Link>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main id="fx-main" className="fx-main">
        {/* HERO */}
        <section className="fx-hero fx-hero-workspace">
          <div className="fx-hero-copy">
            <div className="fx-eyebrow fx-reveal"><span className="dot" />Fábrica de apps · chat profesional</div>
            <h1 className="fx-reveal d1">Pregunta lo que quieras. <b>Forja lo que vendas.</b></h1>
            <p className="fx-sub fx-reveal d2">
              VForge convierte conversaciones reales en propuesta, preview, plantilla, repo y despliegue.
              Una pantalla limpia para operar tu fábrica sin brincar entre veinte chats.
            </p>
            <div className="fx-herocta fx-reveal d3">
              <Link className="fx-pill solid" href="/sign-up">Entrar a Forge</Link>
              <Link className="fx-pill ghost" href="#flujo">Ver flujo</Link>
            </div>
          </div>

          <div className="fx-chat-shell fx-reveal d2" aria-label="Vista previa del chat VForge">
            <div className="fx-chat-top">
              <button type="button" aria-label="Abrir navegación"><span /><span /><span /></button>
              <div className="fx-chat-brand"><ForgeMark size={15} /><span>FORGE</span></div>
              <div className="fx-avatar" aria-label="Perfil">LU</div>
            </div>

            <div className="fx-chat-body">
              <div className="fx-source-bar">
                <SearchMark size={16} />
                <span>WhatsApp, Claude, ChatGPT, Trama...</span>
                <b>15 fuentes</b>
              </div>

              <div className="fx-message user">Tengo este chat con un cliente. Quiero una app y una propuesta.</div>
              <div className="fx-message assistant">
                <span className="fx-message-kicker">VForge</span>
                Te armo la ruta: propuesta comercial, preview visual, plantilla base y repositorio listo para desplegar.
                <div className="fx-message-actions">
                  <span>Propuesta</span>
                  <span>Preview</span>
                  <span>Repo</span>
                </div>
              </div>
            </div>

            <div className="fx-fixed-dock" aria-label="Botonera fija de onboarding">
              {onboardingButtons.map((item) => (
                <button type="button" key={item.name} aria-label={`${item.name}: ${item.caption}`}>
                  <span className="fx-dock-icon">{item.icon}</span>
                  <span className="fx-dock-text">
                    <b>
                      <span className="fx-dock-full">{item.name}</span>
                      <span className="fx-dock-mobile">{item.mobileName}</span>
                    </b>
                    <small>{item.caption}</small>
                  </span>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="fx-compose">
              <button type="button" className="fx-compose-round" aria-label="Abrir Castores"><PlusMark /></button>
              <div className="fx-compose-field">Trabajar en VForge</div>
              <button type="button" className="fx-compose-round mic" aria-label="Dictar"><MicMark /></button>
            </div>
          </div>
        </section>

        {/* FLUJO */}
        <section id="flujo">
          <div className="fx-wrap">
            <div className="fx-sechead fx-reveal">
              <span className="tag">/ Flujo</span>
              <h2>De conversación a entrega. <b>Sin teatro.</b></h2>
              <p>El chat no responde por responder: estructura, cotiza, visualiza y deja listo el arranque técnico.</p>
            </div>
            <div className="fx-steps">
              {[
                ["01", "Carga la fuente", "WhatsApp, SIP/Trama, Claude, ChatGPT o un brief directo.",
                  <path key="a" d="M4 7h16M4 12h11M4 17h7M18 15l2 2 3-4" />],
                ["02", "Entiende el caso", "Resume intención, dolores, módulos, riesgos y preguntas faltantes.",
                  <path key="b" d="M12 3a7 7 0 0 0-7 7c0 4.8 7 11 7 11s7-6.2 7-11a7 7 0 0 0-7-7zM9.5 10h5" />],
                ["03", "Genera propuesta", "Crea texto vendible, alcance, fases, precio y siguientes pasos.",
                  <path key="c" d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />],
                ["04", "Forja el arranque", "Preview, plantilla, repo, deploy y MCPs conectados por permisos.",
                  <g key="d"><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></g>],
              ].map(([n, t, d, ic], i) => (
                <div className={`fx-step fx-reveal d${i + 1}`} key={n as string}>
                  <div className="ic"><svg viewBox="0 0 24 24">{ic}</svg></div>
                  <span className="n">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUE INCLUYE */}
        <section id="incluye">
          <div className="fx-wrap">
            <div className="fx-sechead fx-reveal">
              <span className="tag">/ Qué incluye</span>
              <h2>Tu fábrica, <b>en una pantalla.</b></h2>
              <p>El centro es el chat. Los lados son trabajo organizado; la botonera inferior es el superpower fijo.</p>
            </div>
            <div className="fx-feats">
              {[
                ["Chat profesional", "Proyectos, carpetas, historial y conversación con fuentes. No es un bot suelto.",
                  <path key="a" d="M4 5h16v10H7l-3 3V5z" />],
                ["Botonera fija", "GitHub, Vercel, Mind Context y MCPs siempre visibles, con estado y acciones reales.",
                  <path key="b" d="M4 8h16M4 16h16M7 5v6M17 13v6" />],
                ["Widget Dock", "Castores abre apps, widgets y marketplace sin ensuciar la conversación principal.",
                  <path key="c" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />],
                ["Fuentes reales", "WhatsApp, Trama, chats, documentos y repos entran como evidencia, no como contexto inventado.",
                  <path key="d" d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" />],
                ["Preview vendible", "Antes de programar todo, genera imagen, estructura y propuesta para cerrar al cliente.",
                  <path key="e" d="M3 6h18v12H3zM7 10h4M7 14h10" />],
                ["Repo y despliegue", "Cuando el cliente dice sí, el camino sigue a GitHub, Vercel y MCP sin cambiar de herramienta.",
                  <path key="f" d="M12 3v12M7 8l5-5 5 5M5 21h14" />],
              ].map(([t, d, ic], i) => (
                <div className={`fx-feat fx-reveal d${(i % 3) + 1}`} key={t as string}>
                  <div className="ic"><svg viewBox="0 0 24 24">{ic}</svg></div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INTEGRACIONES */}
        <section id="integraciones" className="fx-integ">
          <div className="fx-wrap">
            <div className="lbl fx-reveal">Construido sobre lo que ya confías</div>
            <div className="fx-logos fx-reveal d1">
              {["GitHub", "Vercel", "Neon", "Clerk", "Stripe", "MCP"].map((n) => (
                <div className="lg" key={n}><BrandMark name={n} size={20} /><span>{n}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="fx-ctafinal">
          <div className="fx-wrap">
            <h2 className="fx-reveal">Afíliate a tu <b>fábrica de apps.</b></h2>
            <p className="fx-reveal d1">Trae conversación y cliente. Forge te ayuda a convertirlo en propuesta, producto y seguimiento.</p>
            <div className="fx-reveal d2"><Link className="fx-pill solid" href="/sign-up">Entrar a Forge</Link></div>
          </div>
        </section>

        {/* FOOTER */}
        <footer id="footer" className="fx-footer fx-footer-rich">
          <div className="fx-footer-head">
            <div>
              <div className="fx-brand"><ForgeMark size={20} /><span className="name">Forge</span></div>
              <p>Apps reales. Infra propia. Chat inteligente.</p>
            </div>
            <Link className="fx-pill solid" href="/sign-in">Entrar</Link>
          </div>
          <div className="fx-footer-grid">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3>{col.title}</h3>
                {col.items.map((item) => (
                  <Link href={item === "Términos" ? "/terminos" : item === "Privacidad" ? "/privacidad" : "#"} key={item}>
                    {item}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="fx-footer-bottom">
            <div className="fmeta">© 2026 · All Global Holding · vforge.site</div>
            <span>Hecho para personas que construyen.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
