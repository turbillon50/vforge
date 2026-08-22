import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconArrowR,
  IconEye,
  IconLayout,
  IconShield,
  IconUsers,
} from "@/components/brand/VFIcons";

function ControlRoomPreview() {
  return (
    <div
      id="sala"
      className="overflow-hidden rounded-[14px] border border-black bg-white shadow-[0_24px_70px_rgba(0,0,0,0.10)]"
      aria-label="Estructura de la sala de revisión VForge"
    >
      <div className="flex h-11 items-center justify-between border-b border-[var(--border-1)] px-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          Sala de revisión
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-black">
          <span className="status-shape" data-active="true" />
          En vivo
        </span>
      </div>

      <div className="grid min-h-[430px] grid-cols-[108px_1fr] md:grid-cols-[132px_1fr_150px]">
        <aside className="border-r border-[var(--border-1)] p-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Proyectos
          </p>
          <div className="mt-5 space-y-3">
            <div className="border-l-2 border-black pl-2">
              <p className="text-[10px] font-medium text-black">Proyecto activo</p>
              <p className="mt-1 font-mono text-[8px] text-[var(--fg-muted)]">
                preview
              </p>
            </div>
            <div className="border-l border-[var(--border-1)] pl-2">
              <p className="text-[10px] text-[var(--fg-muted)]">Otro proyecto</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-3">
          <div className="grid h-full grid-cols-[minmax(0,1fr)_92px] gap-2 md:grid-cols-[minmax(0,1fr)_112px]">
            <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-[var(--border-1)]">
              <div className="flex h-8 items-center justify-between border-b border-[var(--border-1)] px-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  Escritorio
                </span>
                <IconEye size={10} />
              </div>
              <div className="flex-1 bg-white">
                <div className="mx-auto mt-7 h-2 w-2/3 rounded-full bg-black/10" />
                <div className="mx-auto mt-2 h-2 w-1/2 rounded-full bg-black/10" />
                <div className="mx-auto mt-6 h-24 w-[78%] border border-black/10" />
              </div>
            </div>

            <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-[var(--border-1)] bg-[#f2f2f0]">
              <div className="flex h-8 items-center justify-between border-b border-[var(--border-1)] bg-white px-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
                  Móvil
                </span>
                <IconLayout size={10} />
              </div>
              <div className="mx-auto mt-4 h-[272px] w-[72px] rounded-[12px] border border-black bg-white p-2 md:w-[84px]">
                <div className="mx-auto h-1 w-5 rounded-full bg-black" />
                <div className="mt-6 h-16 border border-black/10" />
                <div className="mt-4 h-1.5 w-full rounded-full bg-black/10" />
                <div className="mt-2 h-1.5 w-3/4 rounded-full bg-black/10" />
                <div className="mt-5 h-7 rounded-md bg-black" />
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden border-l border-[var(--border-1)] p-3 md:block">
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Actividad real
          </p>
          <div className="mt-5 border-l border-black/20 pl-3">
            <p className="text-[10px] leading-4 text-[var(--fg-muted)]">
              Los eventos autorizados del proyecto aparecen aquí.
            </p>
          </div>
          <div className="mt-5 border-t border-[var(--border-1)] pt-4">
            <p className="text-[10px] font-medium text-black">Comentarios</p>
            <div className="mt-3 h-14 rounded-md border border-[var(--border-1)] bg-white" />
          </div>
          <div className="mt-5 rounded-md border border-dashed border-black p-2 text-center font-mono text-[8px] uppercase tracking-[0.1em]">
            Vista admin
          </div>
        </aside>
      </div>
    </div>
  );
}

const CAPABILITIES = [
  {
    icon: IconLayout,
    title: "Tres vistas, un mismo proyecto",
    body: "Escritorio, móvil y administración se revisan desde la misma sala y apuntan a URLs reales.",
  },
  {
    icon: IconActivity,
    title: "Actividad que sí está ocurriendo",
    body: "Commits, previews y eventos llegan por el canal autorizado del proyecto; no son una simulación.",
  },
  {
    icon: IconUsers,
    title: "Invitados sin entregar las llaves",
    body: "Cada cliente entra como observador o revisor, comenta y ve únicamente el alcance que recibió.",
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
              Abrir VForge <IconArrowR size={13} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="max-w-[620px]">
            <p className="mono-label mb-6 flex items-center gap-2">
              <span className="status-shape" data-active="true" />
              Control room para proyectos vivos
            </p>
            <h1 className="max-w-[610px] text-[clamp(3.2rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.075em]">
              Mira el proyecto mientras se construye.
            </h1>
            <p className="mt-8 max-w-[580px] text-[clamp(1.1rem,1.7vw,1.45rem)] leading-[1.45] text-[var(--fg-secondary)]">
              Escritorio, móvil y administración juntos. Tu equipo construye;
              tus clientes observan, comentan y entienden cada avance sin entrar
              a tu infraestructura.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="btn-primary !min-h-12 !px-7">
                Entrar a mis proyectos <IconArrowR size={14} />
              </Link>
              <a href="#sala" className="btn-ghost !min-h-12 !px-7">
                <IconEye size={14} /> Ver la sala
              </a>
            </div>
          </div>

          <ControlRoomPreview />
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
            <p className="mono-label">Permisos por proyecto</p>
            <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,4.5rem)] leading-[0.98] tracking-[-0.055em]">
              Ojos en tiempo real. Control únicamente donde corresponde.
            </h2>
          </div>
          <div className="flex max-w-md gap-3 border-l border-black pl-5">
            <IconShield size={18} className="mt-0.5 shrink-0" />
            <p className="text-[14px] leading-6">
              Un invitado puede observar y comentar. Nunca recibe secretos,
              terminal, tokens ni control de producción.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-1)] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-[11px] text-[var(--fg-muted)] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <VWordmark className="scale-90 origin-left" />
          <span>VForge · Sala privada de revisión</span>
        </div>
      </footer>
    </div>
  );
}
