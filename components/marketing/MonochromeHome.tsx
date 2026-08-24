import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconArrowR,
  IconEye,
  IconShield,
  IconGithub,
  IconGlobe,
  IconCreditCard,
  IconKey,
} from "@/components/brand/VFIcons";

function StudioPreview() {
  return (
    <div
      id="taller"
      className="overflow-hidden rounded-[14px] border border-black bg-white shadow-[0_24px_70px_rgba(0,0,0,0.10)]"
      aria-label="Vista del taller VForge"
    >
      <div className="flex h-11 items-center justify-between border-b border-[var(--border-1)] px-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          VForge · MCP conectado
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-black">
          <span className="status-shape" data-active="true" />
          Visión activa
        </span>
      </div>
      <div className="grid min-h-[380px] md:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-[var(--border-1)] p-4 md:border-b-0 md:border-r">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Tu IA (Claude · Grok · ChatGPT)
          </p>
          <div className="mt-6 space-y-3">
            <div className="ml-auto max-w-[88%] rounded-md bg-black px-3 py-2">
              <p className="text-[10px] leading-4 text-white">
                ¿Qué preview está vivo en el proyecto X?
              </p>
            </div>
            <div className="max-w-[90%] rounded-md border border-[var(--border-1)] px-3 py-2">
              <p className="text-[10px] leading-4 text-[var(--fg-secondary)]">
                VForge MCP · 3 proyectos · preview desktop + mobile
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Preview real
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-h-[140px] rounded-md border border-[var(--border-1)] p-2">
              <div className="mx-auto mt-5 h-2 w-2/3 rounded-full bg-black/10" />
              <div className="mx-auto mt-2 h-2 w-1/2 rounded-full bg-black/10" />
              <div className="mx-auto mt-5 h-14 w-[78%] border border-black/10" />
            </div>
            <div className="flex min-h-[140px] items-center justify-center rounded-md border border-[var(--border-1)] bg-[#f2f2f0]">
              <div className="h-[100px] w-[48px] rounded-[10px] border border-black bg-white p-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const HOW = [
  {
    n: "01",
    title: "Login",
    body: "Entras a VForge. Una cuenta, vault de secretos y proyectos aislados.",
  },
  {
    n: "02",
    title: "Genera MCP",
    body: "Un token por tu login. Lo pegas en Claude, Grok o ChatGPT.",
  },
  {
    n: "03",
    title: "Conecta infra",
    body: "GitHub, Vercel, Clerk, Neon, Stripe. OAuth real, secretos cifrados, manuales de integración.",
  },
  {
    n: "04",
    title: "Visión",
    body: "Tu IA ve cuenta, previews y deploys. Tú sigues construyendo con la herramienta que ya usas.",
  },
];

const INTEGRATIONS = [
  { name: "GitHub", detail: "Repos y versionado", Icon: IconGithub },
  { name: "Vercel", detail: "Preview y producción", Icon: IconGlobe },
  { name: "Clerk", detail: "Auth y roles", Icon: IconShield },
  { name: "Neon", detail: "Postgres serverless", Icon: IconActivity },
  { name: "Stripe", detail: "Cobros e invoices", Icon: IconCreditCard },
  { name: "MCP", detail: "Claude · Grok · ChatGPT", Icon: IconKey },
];

export function MonochromeHome() {
  return (
    <div className="min-h-dvh bg-[#f7f7f5] text-black">
      <header className="border-b border-[var(--border-1)] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="VForge">
            <VWordmark />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] md:flex">
            <a href="#como" className="text-[var(--fg-secondary)] hover:text-black">
              Cómo funciona
            </a>
            <a href="#integraciones" className="text-[var(--fg-secondary)] hover:text-black">
              Integraciones
            </a>
            <a href="#precios" className="text-[var(--fg-secondary)] hover:text-black">
              Precios
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden px-3 py-2 text-[13px] font-medium sm:inline-flex">
              Entrar
            </Link>
            <Link href="/sign-in" className="btn-primary !min-h-9 !px-4">
              Generar MCP <IconArrowR size={13} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-[640px]">
            <p className="mono-label mb-6 flex items-center gap-2">
              <span className="status-shape" data-active="true" />
              Visión para tu IA de confianza
            </p>
            <h1 className="max-w-[640px] text-[clamp(2.4rem,5.5vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.065em]">
              Cuando construyes con Claude, Grok o ChatGPT, no tienes visión.
            </h1>
            <p className="mt-7 max-w-[520px] text-[clamp(1.05rem,1.5vw,1.28rem)] leading-[1.45] text-[var(--fg-secondary)]">
              VForge genera un MCP con tu login. Lo conectas en la IA que ya usas
              y ganas visión de cuenta, previews y deploys — sin montar otro modelo
              adentro ni quemar tokens en una plataforma más.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="btn-primary !min-h-12 !px-7">
                Empezar gratis <IconArrowR size={14} />
              </Link>
              <a href="#como" className="btn-ghost !min-h-12 !px-7">
                Cómo funciona
              </a>
            </div>
            <p className="mt-5 max-w-md text-[12px] leading-5 text-[var(--fg-muted)]">
              No competimos con Lovable ni Replit. Ellos generan. Nosotros damos
              ojos y control sobre lo que ya construyes.
            </p>
          </div>
          <StudioPreview />
        </section>

        {/* Problema / solución corta */}
        <section className="border-y border-[var(--border-1)] bg-white">
          <div className="mx-auto grid max-w-[1440px] md:grid-cols-2">
            <article className="border-b border-[var(--border-1)] px-6 py-10 md:border-b-0 md:border-r md:px-10 md:py-14">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                El problema
              </p>
              <h2 className="mt-3 text-[22px] font-medium tracking-[-0.02em]">
                La IA escribe código a ciegas
              </h2>
              <p className="mt-3 max-w-md text-[14px] leading-6 text-[var(--fg-secondary)]">
                No ve tu repo vivo, tus previews ni tus secretos bien integrados.
                Cada sesión empieza de cero. En las plataformas de coding el
                manejo de secrets es un desmadre.
              </p>
            </article>
            <article className="px-6 py-10 md:px-10 md:py-14">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                Qué resuelve VForge
              </p>
              <h2 className="mt-3 text-[22px] font-medium tracking-[-0.02em]">
                MCP + vault + previews reales
              </h2>
              <p className="mt-3 max-w-md text-[14px] leading-6 text-[var(--fg-secondary)]">
                Login → token MCP → lo conectas en tu IA. Visión de cuenta y
                previews. Integraciones con OAuth y secretos cifrados. Manuales
                para no improvisar cada cable.
              </p>
            </article>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como" className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 md:py-20">
          <p className="mono-label">Cómo funciona</p>
          <h2 className="mt-3 max-w-2xl text-[clamp(1.8rem,3.5vw,3rem)] font-semibold tracking-[-0.045em]">
            Tu IA de siempre. Nuestros ojos sobre el producto.
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(({ n, title, body }) => (
              <article key={n}>
                <p className="font-mono text-[10px] tracking-[0.14em] text-[var(--fg-muted)]">{n}</p>
                <h3 className="mt-3 text-[18px] font-medium">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[var(--fg-secondary)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Integraciones + secrets */}
        <section id="integraciones" className="border-y border-[var(--border-1)] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 md:py-20">
            <p className="mono-label">Integraciones y secrets</p>
            <h2 className="mt-3 max-w-2xl text-[clamp(1.8rem,3.5vw,3rem)] font-semibold tracking-[-0.045em]">
              La infraestructura unida. Sin pegar tokens a lo loco.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--fg-secondary)]">
              OAuth real, vault cifrado y guías de integración. No montamos una IA
              adentro para cobrarte tokens: te apoyamos a conectar lo que ya usas
              y a que tu modelo de confianza vea el estado real del producto.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATIONS.map(({ name, detail, Icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-4 border border-[var(--border-1)] bg-[#f7f7f5] px-5 py-4"
                >
                  <Icon size={18} />
                  <div>
                    <p className="text-[14px] font-medium">{name}</p>
                    <p className="text-[12px] text-[var(--fg-muted)]">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 md:py-20">
          <p className="mono-label">Precios</p>
          <h2 className="mt-3 max-w-2xl text-[clamp(1.8rem,3.5vw,3rem)] font-semibold tracking-[-0.045em]">
            Simple. Sin quemar presupuesto en un agente interno.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-[var(--fg-secondary)]">
            Un equipo de coding con IA ya te puede costar ~100 USD al mes más
            invoices. VForge es la capa de visión y control, no otra suscripción
            de modelo.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="border border-[var(--border-1)] bg-white p-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                Free
              </p>
              <p className="mt-3 text-[40px] font-semibold tracking-[-0.04em]">$0</p>
              <p className="mt-1 text-[14px] text-[var(--fg-secondary)]">1 proyecto</p>
              <ul className="mt-6 space-y-2 text-[13px] leading-6 text-[var(--fg-secondary)]">
                <li>MCP con tu login</li>
                <li>Vault de secrets</li>
                <li>Preview y sala de revisión</li>
                <li>Integraciones esenciales</li>
              </ul>
              <Link href="/sign-in" className="btn-ghost mt-8 !min-h-11 !px-5 inline-flex">
                Empezar free <IconArrowR size={13} />
              </Link>
            </div>

            <div className="border border-black bg-white p-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                Starter
              </p>
              <p className="mt-3 text-[40px] font-semibold tracking-[-0.04em]">
                $20<span className="text-[16px] font-medium text-[var(--fg-muted)]"> / mes</span>
              </p>
              <p className="mt-1 text-[14px] text-[var(--fg-secondary)]">
                Hasta 10 proyectos · + invoices
              </p>
              <ul className="mt-6 space-y-2 text-[13px] leading-6 text-[var(--fg-secondary)]">
                <li>Todo lo de Free</li>
                <li>Más proyectos y equipo</li>
                <li>Manuales de integración</li>
                <li>Facturación / invoices</li>
              </ul>
              <Link href="/sign-in" className="btn-primary mt-8 !min-h-11 !px-5 inline-flex">
                Ir a Starter <IconArrowR size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-[var(--border-1)] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-20">
            <div className="flex flex-col gap-8 border border-black p-8 md:flex-row md:items-center md:justify-between md:p-12">
              <div>
                <p className="mono-label">MCP</p>
                <h2 className="mt-3 text-[clamp(1.5rem,2.8vw,2.2rem)] font-semibold tracking-[-0.04em]">
                  Genera el token. Conéctalo. Tu IA deja de trabajar a ciegas.
                </h2>
                <p className="mt-2 max-w-md text-[14px] text-[var(--fg-secondary)]">
                  Free para un proyecto. Starter cuando el taller crece.
                </p>
              </div>
              <Link href="/sign-in" className="btn-primary !min-h-12 !px-8 shrink-0">
                Abrir VForge <IconArrowR size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-1)] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-[11px] text-[var(--fg-muted)] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <VWordmark className="origin-left scale-90" />
          <span>VForge · Visión y control para builders con IA</span>
        </div>
      </footer>
    </div>
  );
}
