"use client";

import Link from "next/link";
import { useEffect } from "react";
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

const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function MonochromeHome() {
  useEffect(() => {
    const splash = document.getElementById("fx-splash");
    const main = document.getElementById("fx-main");
    const hdr = document.getElementById("fx-hdr");
    const DUR = 4200;
    let done = false;
    let io: IntersectionObserver | null = null;

    function startReveal() {
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

  return (
    <div className="fx-root">
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

      {/* ===== HEADER ===== */}
      <header id="fx-hdr" className="fx-hdr">
        <div className="fx-brand"><ForgeMark size={22} /><span className="name">Forge</span></div>
        <nav className="fx-links">
          <Link href="#como">Cómo funciona</Link>
          <Link href="#que">Qué hace</Link>
          <Link href="#integraciones">Integraciones</Link>
          <Link href="#precios">Precios</Link>
        </nav>
        <div className="fx-navcta">
          <Link className="fx-pill ghost" href="/sign-in">Entrar</Link>
          <Link className="fx-pill solid" href="/sign-up">Empezar gratis</Link>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main id="fx-main" className="fx-main">
        {/* HERO */}
        <section className="fx-hero">
          <div className="fx-eyebrow fx-reveal"><span className="dot" />Model Context Protocol · v1</div>
          <h1 className="fx-reveal d1">Visión para tu <b>IA de confianza</b></h1>
          <p className="fx-sub fx-reveal d2">
            Forge genera un MCP con tu propio acceso y lo conectas en tu IA — Claude, ChatGPT o la que uses.
            Tu asistente ve tus proyectos, lanza previews y despliega sobre la infraestructura que ya tienes.
          </p>
          <div className="fx-herocta fx-reveal d3">
            <Link className="fx-pill solid" href="/sign-up">Empezar gratis</Link>
            <Link className="fx-pill ghost" href="#como">Ver cómo funciona</Link>
          </div>
          <div className="fx-scroll fx-reveal d5"><span>Desliza</span><div className="bar" /></div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como">
          <div className="fx-wrap">
            <div className="fx-sechead fx-reveal">
              <span className="tag">/ Cómo funciona</span>
              <h2>Cuatro pasos. <b>Cero fricción.</b></h2>
              <p>No migras nada. Forge se monta sobre lo que ya usas y le da ojos a tu IA.</p>
            </div>
            <div className="fx-steps">
              {[
                ["01", "Inicia sesión", "Entras con tu cuenta. Sin configurar servidores ni claves a mano.",
                  <path key="a" d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />],
                ["02", "Genera tu MCP", "Forge crea un endpoint MCP con tu acceso, listo para pegar en tu IA.",
                  <path key="b" d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" />],
                ["03", "Conecta tu infra", "GitHub, Vercel, Clerk, Neon y Stripe — enlazados con un clic.",
                  <path key="c" d="M9 12h6M12 9v6M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" />],
                ["04", "Tu IA ya ve todo", "Pregunta, previsualiza y despliega. Tu asistente opera tu stack.",
                  <g key="d"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></g>],
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

        {/* QUE HACEMOS */}
        <section id="que">
          <div className="fx-wrap">
            <div className="fx-sechead fx-reveal">
              <span className="tag">/ Qué hace</span>
              <h2>Tu infraestructura, <b>hablada.</b></h2>
              <p>Todo lo que harías en cinco pestañas, tu IA lo hace en una conversación.</p>
            </div>
            <div className="fx-feats">
              {[
                ["Visión de cuenta", "Proyectos, repos, deploys y bases de datos — todo el estado de tu cuenta a la vista de tu IA en tiempo real.",
                  <path key="a" d="M3 9h18M9 21V9M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />],
                ["Previews al vuelo", "Pide un cambio y obtén una URL de preview lista para revisar, antes de tocar producción.",
                  <path key="b" d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />],
                ["Deploys por voz", "\"Sube a producción.\" Forge encadena commit, build y deploy sobre tu Vercel — con tu firma.",
                  <path key="c" d="M22 12h-4l-3 9L9 3l-3 9H2" />],
                ["Bóveda de secretos", "Tus claves viven cifradas. Se usan sin exponerse y se rotan cuando lo pides.",
                  <g key="d"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></g>],
                ["Verificación real", "Forge comprueba que cada conexión responde — nada de \"listo\" sin evidencia.",
                  <path key="e" d="M20 6 9 17l-5-5" />],
                ["Historial vivo", "Cada acción queda registrada: quién, qué y cuándo. Auditable de punta a punta.",
                  <g key="f"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></g>],
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

        {/* PRECIOS */}
        <section id="precios">
          <div className="fx-wrap">
            <div className="fx-sechead center fx-reveal">
              <span className="tag">/ Precios</span>
              <h2>Empieza gratis. <b>Crece cuando quieras.</b></h2>
            </div>
            <div className="fx-prices">
              <div className="fx-plan fx-reveal d1">
                <div className="pname">Free</div>
                <div className="amt">$0<small> /mes</small></div>
                <p className="pdesc">Para probar la visión con un proyecto.</p>
                <ul>
                  {["1 proyecto conectado", "MCP con tu acceso", "Previews ilimitados", "Bóveda de secretos"].map((f) => (
                    <li key={f}>{CHECK}{f}</li>
                  ))}
                </ul>
                <Link className="fx-pill ghost" href="/sign-up">Empezar gratis</Link>
              </div>
              <div className="fx-plan hi fx-reveal d2">
                <div className="badge">Recomendado</div>
                <div className="pname">Starter</div>
                <div className="amt">$20<small> /mes</small></div>
                <p className="pdesc">Para operar tu stack completo con tu IA.</p>
                <ul>
                  {["Hasta 10 proyectos", "Deploys a producción", "Todas las integraciones", "Historial y auditoría", "Rotación de claves"].map((f) => (
                    <li key={f}>{CHECK}{f}</li>
                  ))}
                </ul>
                <Link className="fx-pill solid" href="/sign-up">Elegir Starter</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="fx-ctafinal">
          <div className="fx-wrap">
            <h2 className="fx-reveal">Dale <b>ojos</b> a tu IA.</h2>
            <p className="fx-reveal d1">Conecta tu infraestructura en minutos y deja que tu asistente construya contigo.</p>
            <div className="fx-reveal d2"><Link className="fx-pill solid" href="/sign-up">Empezar gratis</Link></div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="fx-footer">
          <div className="fx-brand"><ForgeMark size={19} /><span className="name">Forge</span></div>
          <nav>
            <Link href="#como">Cómo funciona</Link>
            <Link href="#precios">Precios</Link>
            <Link href="/developers">Docs</Link>
            <Link href="/terminos">Términos</Link>
          </nav>
          <div className="fmeta">© 2026 · vforge.site</div>
        </footer>
      </main>
    </div>
  );
}
