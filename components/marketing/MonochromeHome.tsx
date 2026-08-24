import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconArrowR,
  IconEye,
  IconLayout,
  IconShield,
  IconUsers,
  IconZap,
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
          VForge · Estudio
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-black">
          <span className="status-shape" data-active="true" />
          En vivo
        </span>
      </div>
      <div className="grid min-h-[380px] md:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-[var(--border-1)] p-4 md:border-b-0 md:border-r">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Conversación
          </p>
          <div className="mt-6 space-y-3">
            <div className="ml-auto max-w-[88%] rounded-md bg-black px-3 py-2">
              <p className="text-[10px] leading-4 text-white">
                Despliega la home y abre preview
              </p>
            </div>
            <div className="max-w-[90%] rounded-md border border-[var(--border-1)] px-3 py-2">
              <p className="text-[10px] leading-4 text-[var(--fg-secondary)]">
                Commit · Vercel · URL lista
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
    title: "Cuenta",
    body: "Entras con Clerk. Sesión segura, roles owner / revisor / observador.",
  },
  {
    n: "02",
    title: "Conecta",
    body: "GitHub, Vercel, Stripe, Neon, MCP. La infraestructura de la empresa en un solo lugar.",
  },
  {
    n: "03",
    title: "Construye",
    body: "Hablas con el agente. Código, preview y deploy en el mismo estudio.",
  },
  {
    n: "04",
    title: "Entrega",
    body: "El cliente ve escritorio, móvil y admin en vivo — sin tocar tus secretos.",
  },
];

const INTEGRATIONS = [
  { name: "GitHub", detail: "Repos y versionado", Icon: IconGithub },
  { name: "Vercel", detail: "Preview y producción", Icon: IconGlobe },
  { name: "Clerk", detail: "Auth y roles", Icon: IconShield },
  { name: "Neon", detail: "Postgres serverless", Icon: IconActivity },
  { name: "Stripe", detail: "Cobros reales", Icon: IconCreditCard },
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
            <a href="#estrategia" className="text-[var(--fg-secondary)] hover:text-black">
              Estrategia
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden px-3 py-2 text-[13px] font-medium sm:inline-flex">
              Entrar
            </Link>
            <Link href="/sign-in" className="btn-primary !min-h-9 !px-4">
              Abrir taller <IconArrowR size={13} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="max-w-[640px]">
            <p className="mono-label mb-6 flex items-center gap-2">
              <span className="status-shape" data-active="true" />
              Plan · Integrate · Execute
            </p>
            <h1 className="max-w-[620px] text-[clamp(2.6rem,6vw,5.4rem)] font-semibold leading-[0.92] tracking-[-0.07em]">
              Taller para construir y operar productos con IA.
            </h1>
            <p className="mt-7 max-w-[520px] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-[1.45] text-[var(--fg-secondary)]">
              No es solo un visor. Conectas GitHub, Vercel, Clerk, Neon y el resto.
              Construyes en conversación. Tus clientes ven el avance en tiempo real
              sin entrar a tu infraestructura.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="btn-primary !min-h-12 !px-7">
                Empezar <IconArrowR size={14} />
              </Link>
              <a href="#como" className="btn-ghost !min-h-12 !px-7">
                Cómo funciona
              </a>
            </div>
          </div>
          <StudioPreview />
        </section>

        {/* Cómo funciona */}
        <section id="como" className="border-y border-[var(--border-1)] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 md:py-20">
            <p className="mono-label">Cómo funciona</p>
            <h2 className="mt-3 max-w-2xl text-[clamp(1.8rem,3.5vw,3rem)] font-semibold tracking-[-0.045em]">
              Del login al deploy, sin cambiar de herramienta.
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
          </div>
        </section>

        {/* Integraciones */}
        <section id="integraciones" className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 md:py-20">
          <p className="mono-label">Integraciones</p>
          <h2 className="mt-3 max-w-2xl text-[clamp(1.8rem,3.5vw,3rem)] font-semibold tracking-[-0.045em]">
            La infraestructura que ya usas, en un solo centro de control.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-[var(--fg-secondary)]">
            OAuth real y secretos cifrados. No pegues tokens a mano. Clerk para identidad,
            Neon para datos, GitHub y Vercel para construir y publicar, Stripe para cobrar,
            MCP para mandar desde Claude, Grok o ChatGPT.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map(({ name, detail, Icon }) => (
              <div
                key={name}
                className="flex items-center gap-4 border border-[var(--border-1)] bg-white px-5 py-4"
              >
                <Icon size={18} />
                <div>
                  <p className="text-[14px] font-medium">{name}</p>
                  <p className="text-[12px] text-[var(--fg-muted)]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Estrategia / modelo */}
        <section id="estrategia" className="border-y border-[var(--border-1)] bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 md:grid-cols-2 md:px-8 md:py-20">
            <div>
              <p className="mono-label">Estrategia</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold tracking-[-0.045em]">
                Primero que te funcione a ti. Después a tus clientes.
              </h2>
              <p className="mt-5 text-[15px] leading-7 text-[var(--fg-secondary)]">
                VForge nace como el taller del builder: conectar la empresa, construir con
                agentes y entregar con control. La sala en vivo para invitados es el módulo
                de revisión — no el producto completo.
              </p>
              <p className="mt-4 text-[15px] leading-7 text-[var(--fg-secondary)]">
                Modelo orientado a software factories y equipos en LATAM: memoria de negocio,
                menos tokens tirados, continuidad entre sesiones. Módulos y SaaS cuando el
                núcleo ya opera.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "Owner",
                  body: "Control total: repos, deploys, vault, MCP, invitaciones.",
                },
                {
                  title: "Revisor / observador",
                  body: "Ve preview y comenta. Cero secretos, cero terminal, cero producción.",
                },
                {
                  title: "Aislamiento",
                  body: "Todo por proyecto. Un cliente no ve el de otro. Fail-closed.",
                },
              ].map(({ title, body }) => (
                <div key={title} className="border border-[var(--border-1)] px-5 py-4">
                  <p className="text-[14px] font-medium">{title}</p>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--fg-secondary)]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-24">
          <div className="flex flex-col gap-8 border border-black bg-white p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <p className="mono-label">Listo</p>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold tracking-[-0.04em]">
                Entra, conecta y construye.
              </h2>
              <p className="mt-2 max-w-md text-[14px] text-[var(--fg-secondary)]">
                Setup de conexiones cuando tú quieras. Nadie te encierra en un paso a la fuerza.
              </p>
            </div>
            <Link href="/sign-in" className="btn-primary !min-h-12 !px-8 shrink-0">
              Abrir VForge <IconArrowR size={14} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-1)] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-[11px] text-[var(--fg-muted)] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <VWordmark className="origin-left scale-90" />
          <span>VForge · Taller de construcción con IA</span>
        </div>
      </footer>
    </div>
  );
}
