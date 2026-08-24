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
          Listo
        </span>
      </div>

      <div className="grid min-h-[400px] grid-cols-[1fr] md:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-[var(--border-1)] p-4 md:border-b-0 md:border-r">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Conversación de trabajo
          </p>
          <div className="mt-6 space-y-3">
            <div className="ml-auto max-w-[85%] rounded-md bg-black px-3 py-2">
              <p className="text-[10px] leading-4 text-white">
                Construye la home y despliega en Vercel
              </p>
            </div>
            <div className="max-w-[90%] rounded-md border border-[var(--border-1)] px-3 py-2">
              <p className="text-[10px] leading-4 text-[var(--fg-secondary)]">
                Repo listo · commit · preview en vivo
              </p>
            </div>
          </div>
          <div className="mt-8 h-10 rounded-md border border-[var(--border-1)] bg-[#f7f7f5]" />
        </div>

        <div className="p-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Preview real
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-h-[160px] rounded-md border border-[var(--border-1)] p-2">
              <div className="mx-auto mt-6 h-2 w-2/3 rounded-full bg-black/10" />
              <div className="mx-auto mt-2 h-2 w-1/2 rounded-full bg-black/10" />
              <div className="mx-auto mt-6 h-16 w-[78%] border border-black/10" />
            </div>
            <div className="flex min-h-[160px] items-center justify-center rounded-md border border-[var(--border-1)] bg-[#f2f2f0]">
              <div className="h-[120px] w-[56px] rounded-[10px] border border-black bg-white p-1.5">
                <div className="mx-auto h-1 w-4 rounded-full bg-black" />
                <div className="mt-4 h-10 border border-black/10" />
                <div className="mt-3 h-5 rounded-sm bg-black" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {["GitHub", "Vercel", "MCP"].map((label) => (
              <span
                key={label}
                className="rounded border border-[var(--border-1)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CAPABILITIES = [
  {
    icon: IconZap,
    title: "Conecta la empresa",
    body: "GitHub, Vercel, Stripe y MCP. Un solo lugar para armar la infraestructura y dejar de pegar tokens a mano.",
  },
  {
    icon: IconLayout,
    title: "Construye con agentes",
    body: "Conversación, código, preview y deploy en el mismo estudio. Tres vistas reales, no mockups.",
  },
  {
    icon: IconUsers,
    title: "Clientes sin las llaves",
    body: "Invita a observar y comentar. Nunca reciben secretos, terminal ni control de producción.",
  },
];

export function MonochromeHome() {
  return (
    <div className="min-h-dvh bg-[#f7f7f5] text-black">
      <header className="border-b border-[var(--border-1)] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="VForge, inicio">
            <VWordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden px-3 py-2 text-[13px] font-medium sm:inline-flex"
            >
              Entrar
            </Link>
            <Link href="/sign-in" className="btn-primary !min-h-9 !px-4">
              Abrir taller <IconArrowR size={13} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="max-w-[640px]">
            <p className="mono-label mb-6 flex items-center gap-2">
              <span className="status-shape" data-active="true" />
              Plan · Integrate · Execute
            </p>
            <h1 className="max-w-[620px] text-[clamp(2.8rem,6.5vw,5.8rem)] font-semibold leading-[0.9] tracking-[-0.07em]">
              El taller donde construyes y operas con IA.
            </h1>
            <p className="mt-8 max-w-[540px] text-[clamp(1.05rem,1.6vw,1.35rem)] leading-[1.45] text-[var(--fg-secondary)]">
              Conecta GitHub, Vercel y el resto. Habla con el agente. Mira el
              preview. Despliega. Tus clientes ven el avance sin tocar tu
              infraestructura.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="btn-primary !min-h-12 !px-7">
                Empezar <IconArrowR size={14} />
              </Link>
              <a href="#taller" className="btn-ghost !min-h-12 !px-7">
                <IconEye size={14} /> Ver el estudio
              </a>
            </div>
          </div>

          <StudioPreview />
        </section>

        <section className="border-y border-[var(--border-1)] bg-white">
          <div className="mx-auto grid max-w-[1440px] md:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, body }, index) => (
              <article
                key={title}
                className="border-b border-[var(--border-1)] px-6 py-9 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <div className="mb-8 flex items-center justify-between">
                  <Icon size={17} />
                  <span className="font-mono text-[9px] tracking-[0.16em] text-[var(--fg-muted)]">
                    0{index + 1}
                  </span>
                </div>
                <h2 className="text-[20px] font-medium">{title}</h2>
                <p className="mt-3 max-w-sm text-[14px] leading-6">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-16 md:flex-row md:items-end md:justify-between md:px-8 md:py-24">
          <div>
            <p className="mono-label">Recorrido</p>
            <h2 className="mt-4 max-w-2xl text-[clamp(1.8rem,3.5vw,3.2rem)] leading-[1.05] tracking-[-0.045em]">
              Landing → cuenta → conexiones → construir.
            </h2>
          </div>
          <div className="flex max-w-md gap-3 border-l border-black pl-5">
            <IconShield size={18} className="mt-0.5 shrink-0" />
            <p className="text-[14px] leading-6">
              Logo VForge (el triángulo invertido). Blanco y negro. Pro, sin ruido.
              Un invitado ve y comenta; nunca recibe secretos.
            </p>
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
