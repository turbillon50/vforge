"use client";

import Link from "next/link";
import { useEffect } from "react";

/* Logo aprobado: triángulo invertido relleno + wordmark ligero */
function ForgeMark({ size = 19, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 14" width={size} height={(size * 14) / 16} aria-hidden="true" className={className}>
      <path d="M0 0h16L8 14z" fill="currentColor" />
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
    const cap = document.getElementById("fx-cap");
    const stage = document.getElementById("fx-stage");
    const birth = document.getElementById("fx-birth");
    const pillars = Array.from(document.querySelectorAll<HTMLElement>(".fx-pillar"));
    const hdr = document.getElementById("fx-hdr");
    if (!splash || !main) return;

    const timers: number[] = [];
    let io: IntersectionObserver | null = null;
    let done = false;

    const setCap = (t: string) => {
      if (!cap) return;
      cap.classList.remove("show");
      timers.push(window.setTimeout(() => { cap.textContent = t; cap.classList.add("show"); }, 260));
    };

    const startReveal = () => {
      const hero = document.querySelectorAll<HTMLElement>(".fx-hero .fx-reveal");
      hero.forEach((el, i) => timers.push(window.setTimeout(() => el.classList.add("in"), 120 + i * 90)));
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io?.unobserve(e.target); } }),
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
      );
      document.querySelectorAll<HTMLElement>("section:not(.fx-hero) .fx-reveal").forEach((el) => io?.observe(el));
    };

    const finish = () => {
      if (done) return;
      done = true;
      splash.classList.add("gone");
      main.classList.add("live");
      startReveal();
    };

    const T: Array<[number, () => void]> = [
      [200, () => { setCap("Tres pilares. Tres fortalezas."); pillars[0]?.classList.add("show"); }],
      [520, () => pillars[1]?.classList.add("show")],
      [840, () => pillars[2]?.classList.add("show")],
      [1900, () => setCap("Cada uno aporta lo mejor.")],
      [3100, () => { setCap("Confluyen."); stage?.classList.add("merge"); }],
      [4300, () => { setCap("Se transforma."); pillars.forEach((p) => (p.style.opacity = "0")); }],
      [4900, () => { birth?.classList.add("show"); setCap("Nace Forge. Sobre lo mejor."); }],
      [6400, () => setCap("El futuro. Impulsado por IA.")],
      [8000, finish],
    ];
    T.forEach(([t, fn]) => timers.push(window.setTimeout(fn, t)));

    const skip = () => { if (!splash.classList.contains("gone")) finish(); };
    splash.addEventListener("click", skip);

    const onScroll = () => hdr?.classList.toggle("stuck", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      timers.forEach(clearTimeout);
      io?.disconnect();
      splash.removeEventListener("click", skip);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="fx-root">
      {/* ===== SPLASH ===== */}
      <div id="fx-splash" className="fx-splash">
        <div id="fx-stage" className="fx-stage">
          <div className="fx-pillars">
            <div className="fx-pillar">
              <svg className="fx-glyph" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 6v12M6 12h12" /></svg>
              <span>GitHub</span>
            </div>
            <div className="fx-pillar">
              <svg className="fx-glyph" viewBox="0 0 24 24"><polygon className="fill" points="12,3 22,20 2,20" /></svg>
              <span>Vercel</span>
            </div>
            <div className="fx-pillar">
              <svg className="fx-glyph" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 15V9l6 6V9" /></svg>
              <span>Neon · Clerk</span>
            </div>
          </div>
          <div id="fx-birth" className="fx-birth">
            <div className="mark"><ForgeMark size={40} /><span className="word">Forge</span></div>
            <div className="tag">Impulsado por IA</div>
          </div>
          <div id="fx-cap" className="fx-cap" />
        </div>
      </div>

      {/* ===== NAV ===== */}
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
                <div className="lg" key={n}><ForgeMark size={20} /><span>{n}</span></div>
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
            <Link href="/legal/terminos">Términos</Link>
          </nav>
          <div className="fmeta">© 2026 · vforge.site</div>
        </footer>
      </main>

      <style jsx>{`
        .fx-root { --ink:#0A0A0A; --ink2:#3F3F46; --muted:#71717A; --line:#E8E8E8; --line2:#DADADA; --soft:#F6F6F6; --black:#0A0A0A; --white:#FFFFFF; --ease:cubic-bezier(.22,.61,.36,1); color:var(--ink); }
        .fx-root :global(*){ box-sizing:border-box; }

        .fx-splash{ position:fixed; inset:0; z-index:9999; background:var(--black); display:flex; align-items:center; justify-content:center; transition:opacity 1s var(--ease),visibility 1s var(--ease); }
        .fx-splash.gone{ opacity:0; visibility:hidden; }
        .fx-stage{ position:relative; width:min(90vw,640px); height:340px; display:flex; align-items:center; justify-content:center; }
        .fx-pillars{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; gap:96px; }
        .fx-pillar{ display:flex; flex-direction:column; align-items:center; gap:18px; opacity:0; transform:translateY(20px); transition:opacity .9s var(--ease),transform .9s var(--ease); }
        .fx-pillar.show{ opacity:1; transform:translateY(0); }
        .fx-pillar :global(svg){ width:44px; height:44px; }
        .fx-pillar :global(.fx-glyph path), .fx-pillar :global(.fx-glyph rect), .fx-pillar :global(.fx-glyph circle){ stroke:var(--white); stroke-width:1.6; fill:none; }
        .fx-pillar :global(.fx-glyph .fill){ fill:var(--white); stroke:none; }
        .fx-pillar span{ font-size:11px; letter-spacing:.28em; text-transform:uppercase; color:#8A8A8A; }
        .fx-stage.merge .fx-pillars{ gap:0; }
        .fx-stage.merge .fx-pillar span{ opacity:0; transition:opacity .5s; }
        .fx-stage.merge .fx-pillar :global(svg){ transform:scale(.6); transition:transform .9s var(--ease); }

        .fx-birth{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; opacity:0; transform:scale(.94); pointer-events:none; transition:opacity 1s var(--ease),transform 1s var(--ease); }
        .fx-birth.show{ opacity:1; transform:scale(1); }
        .fx-birth .mark{ display:flex; align-items:center; gap:18px; color:var(--white); }
        .fx-birth .word{ font-weight:300; letter-spacing:.34em; font-size:34px; color:var(--white); text-transform:uppercase; }
        .fx-birth .tag{ font-size:11px; letter-spacing:.3em; text-transform:uppercase; color:#7A7A7A; }

        .fx-cap{ position:absolute; bottom:-56px; left:0; right:0; text-align:center; font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:#6E6E6E; opacity:0; transition:opacity .6s var(--ease); }
        .fx-cap.show{ opacity:1; }

        .fx-hdr{ position:fixed; top:0; left:0; right:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:22px clamp(20px,5vw,64px); background:rgba(255,255,255,0); border-bottom:1px solid transparent; transition:background .4s var(--ease),border-color .4s var(--ease),padding .4s var(--ease); }
        .fx-hdr.stuck{ background:rgba(255,255,255,.82); backdrop-filter:blur(18px); border-bottom:1px solid var(--line); padding-top:16px; padding-bottom:16px; }
        .fx-brand{ display:flex; align-items:center; gap:12px; color:var(--ink); }
        .fx-brand .name{ font-weight:300; letter-spacing:.24em; font-size:16px; text-transform:uppercase; }
        .fx-links{ display:flex; align-items:center; gap:36px; }
        .fx-links :global(a){ font-size:14px; color:var(--ink2); transition:color .2s; }
        .fx-links :global(a:hover){ color:var(--ink); }
        .fx-navcta{ display:flex; align-items:center; gap:14px; }
        .fx-pill{ display:inline-flex; align-items:center; gap:8px; border-radius:999px; font-size:14px; font-weight:500; padding:11px 22px; transition:all .25s var(--ease); cursor:pointer; border:1px solid transparent; white-space:nowrap; }
        :global(.fx-pill.solid){ background:var(--ink); color:var(--white); }
        :global(.fx-pill.solid:hover){ background:#2A2A2A; transform:translateY(-1px); }
        :global(.fx-pill.ghost){ background:transparent; color:var(--ink); border-color:var(--line2); }
        :global(.fx-pill.ghost:hover){ border-color:var(--ink); background:var(--soft); }
        @media(max-width:820px){ .fx-links{ display:none; } }

        .fx-reveal{ opacity:0; transform:translateY(28px); transition:opacity .9s var(--ease),transform .9s var(--ease); }
        :global(.fx-reveal.in){ opacity:1; transform:translateY(0); }
        .d1{ transition-delay:.08s; } .d2{ transition-delay:.16s; } .d3{ transition-delay:.24s; } .d4{ transition-delay:.32s; } .d5{ transition-delay:.4s; }

        .fx-main{ opacity:0; transition:opacity .8s var(--ease); }
        .fx-main.live{ opacity:1; }

        .fx-hero{ min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:140px clamp(20px,5vw,64px) 90px; position:relative; }
        .fx-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:7px 16px; margin-bottom:34px; }
        .fx-eyebrow .dot{ width:6px; height:6px; border-radius:50%; background:var(--ink); animation:fxpulse 2.4s infinite; }
        @keyframes fxpulse{ 0%,100%{opacity:1} 50%{opacity:.3} }
        .fx-hero h1{ font-weight:300; font-size:clamp(42px,7vw,84px); line-height:1.03; letter-spacing:-.03em; max-width:14ch; }
        .fx-hero h1 b{ font-weight:500; }
        .fx-sub{ font-size:clamp(17px,2vw,20px); color:var(--ink2); max-width:52ch; margin:30px auto 44px; line-height:1.6; }
        .fx-herocta{ display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }
        .fx-scroll{ position:absolute; bottom:34px; left:50%; transform:translateX(-50%); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); display:flex; flex-direction:column; align-items:center; gap:10px; }
        .fx-scroll .bar{ width:1px; height:34px; background:linear-gradient(var(--line2),transparent); animation:fxdrop 2s infinite; }
        @keyframes fxdrop{ 0%{transform:scaleY(0);transform-origin:top} 50%{transform:scaleY(1);transform-origin:top} 50.1%{transform:scaleY(1);transform-origin:bottom} 100%{transform:scaleY(0);transform-origin:bottom} }

        .fx-main section{ padding:clamp(90px,12vh,150px) clamp(20px,5vw,64px); }
        .fx-wrap{ max-width:1120px; margin:0 auto; }
        .fx-sechead{ margin-bottom:64px; max-width:640px; }
        .fx-sechead.center{ text-align:center; margin-left:auto; margin-right:auto; }
        .fx-sechead .tag{ font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--muted); font-family:var(--font-geist-mono,monospace); margin-bottom:18px; display:block; }
        .fx-sechead h2{ font-weight:300; font-size:clamp(30px,4.5vw,50px); line-height:1.1; letter-spacing:-.025em; }
        .fx-sechead h2 b{ font-weight:500; }
        .fx-sechead p{ color:var(--ink2); font-size:17px; margin-top:20px; max-width:54ch; }

        .fx-steps{ display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
        .fx-step{ padding:38px 30px; border-right:1px solid var(--line); display:flex; flex-direction:column; gap:16px; transition:background .3s var(--ease); }
        .fx-step:last-child{ border-right:none; }
        .fx-step:hover{ background:var(--soft); }
        .fx-step .n{ font-family:var(--font-geist-mono,monospace); font-size:12px; color:var(--muted); letter-spacing:.1em; }
        .fx-step .ic{ width:38px; height:38px; display:flex; align-items:center; justify-content:center; border:1px solid var(--line2); border-radius:10px; margin-bottom:6px; }
        .fx-step .ic :global(svg){ width:19px; height:19px; stroke:var(--ink); stroke-width:1.7; fill:none; }
        .fx-step h3{ font-weight:500; font-size:18px; letter-spacing:-.01em; }
        .fx-step p{ font-size:14px; color:var(--ink2); line-height:1.55; }
        @media(max-width:900px){ .fx-steps{ grid-template-columns:1fr 1fr; } .fx-step:nth-child(2){ border-right:none; } .fx-step:nth-child(1),.fx-step:nth-child(2){ border-bottom:1px solid var(--line); } }
        @media(max-width:560px){ .fx-steps{ grid-template-columns:1fr; } .fx-step{ border-right:none; border-bottom:1px solid var(--line); } .fx-step:last-child{ border-bottom:none; } }

        .fx-feats{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .fx-feat{ border:1px solid var(--line); border-radius:16px; padding:34px 30px; transition:border-color .3s var(--ease),transform .3s var(--ease); }
        .fx-feat:hover{ border-color:var(--ink); transform:translateY(-3px); }
        .fx-feat .ic{ width:44px; height:44px; border:1px solid var(--line2); border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:22px; }
        .fx-feat .ic :global(svg){ width:22px; height:22px; stroke:var(--ink); stroke-width:1.6; fill:none; }
        .fx-feat h3{ font-weight:500; font-size:19px; margin-bottom:12px; letter-spacing:-.01em; }
        .fx-feat p{ font-size:15px; color:var(--ink2); line-height:1.6; }
        @media(max-width:860px){ .fx-feats{ grid-template-columns:1fr 1fr; } }
        @media(max-width:560px){ .fx-feats{ grid-template-columns:1fr; } }

        .fx-integ{ border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--soft); }
        .fx-integ .fx-wrap{ text-align:center; }
        .fx-integ .lbl{ font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--muted); font-family:var(--font-geist-mono,monospace); margin-bottom:40px; }
        .fx-logos{ display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:clamp(30px,6vw,72px); }
        .fx-logos .lg{ display:flex; align-items:center; gap:12px; color:var(--ink); opacity:.5; transition:opacity .3s var(--ease); }
        .fx-logos .lg:hover{ opacity:1; }
        .fx-logos .lg span{ font-size:16px; letter-spacing:-.01em; }

        .fx-prices{ display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:820px; margin:0 auto; }
        .fx-plan{ border:1px solid var(--line); border-radius:18px; padding:40px 36px; display:flex; flex-direction:column; transition:border-color .3s var(--ease); }
        .fx-plan.hi{ border:1.5px solid var(--ink); position:relative; }
        .fx-plan.hi .badge{ position:absolute; top:-11px; left:36px; background:var(--ink); color:var(--white); font-size:11px; letter-spacing:.14em; text-transform:uppercase; padding:5px 14px; border-radius:999px; font-weight:500; }
        .fx-plan .pname{ font-size:14px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); margin-bottom:20px; }
        .fx-plan .amt{ font-weight:300; font-size:52px; letter-spacing:-.03em; line-height:1; }
        .fx-plan .amt small{ font-size:17px; color:var(--muted); font-weight:400; letter-spacing:0; }
        .fx-plan .pdesc{ font-size:15px; color:var(--ink2); margin:16px 0 28px; min-height:44px; }
        .fx-plan ul{ list-style:none; display:flex; flex-direction:column; gap:14px; margin:0 0 32px; padding:0; flex:1; }
        .fx-plan li{ display:flex; align-items:flex-start; gap:11px; font-size:15px; color:var(--ink2); }
        .fx-plan li :global(svg){ width:16px; height:16px; stroke:var(--ink); stroke-width:2; fill:none; margin-top:4px; flex-shrink:0; }
        .fx-plan :global(.fx-pill){ justify-content:center; width:100%; }
        @media(max-width:660px){ .fx-prices{ grid-template-columns:1fr; } }

        .fx-ctafinal{ background:var(--black); color:var(--white); text-align:center; }
        .fx-ctafinal h2{ font-weight:300; font-size:clamp(32px,5vw,58px); letter-spacing:-.03em; line-height:1.05; max-width:18ch; margin:0 auto; }
        .fx-ctafinal h2 b{ font-weight:500; }
        .fx-ctafinal p{ color:#A1A1AA; font-size:18px; margin:24px auto 40px; max-width:46ch; }
        .fx-ctafinal :global(.fx-pill.solid){ background:var(--white); color:var(--black); }
        .fx-ctafinal :global(.fx-pill.solid:hover){ background:#E4E4E7; }

        .fx-footer{ padding:56px clamp(20px,5vw,64px); border-top:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:20px; }
        .fx-footer .fmeta{ font-size:13px; color:var(--muted); font-family:var(--font-geist-mono,monospace); }
        .fx-footer nav{ display:flex; gap:28px; }
        .fx-footer nav :global(a){ font-size:13px; color:var(--ink2); }
        .fx-footer nav :global(a:hover){ color:var(--ink); }
      `}</style>
    </div>
  );
}
