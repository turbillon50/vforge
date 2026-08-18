import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircleCheck,
  Eye,
  GitBranch,
  LockKeyhole,
  MessageSquare,
  Monitor,
  Rocket,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";

const activity = [
  {
    Icon: GitBranch,
    title: "Nueva versión en main",
    detail: "Interfaz de revisión actualizada",
    tone: "text-violet-300",
  },
  {
    Icon: Rocket,
    title: "Producción actualizada",
    detail: "Build terminado sin errores",
    tone: "text-cyan-300",
  },
  {
    Icon: MessageSquare,
    title: "Comentario de revisión",
    detail: "Ajustar contraste del encabezado",
    tone: "text-amber-200",
  },
];

function BrowserBar({ label }: { label: string }) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-white/[0.07] px-3">
      <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
      <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-white/35">
        {label}
      </div>
    </div>
  );
}

function DesktopPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#08080d] shadow-2xl shadow-black/50">
      <BrowserBar label="producción · desktop" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="h-2.5 w-20 rounded-full bg-white/15" />
          <div className="flex gap-2">
            <span className="h-2 w-8 rounded-full bg-white/10" />
            <span className="h-2 w-8 rounded-full bg-white/10" />
            <span className="h-2 w-8 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="mt-8 max-w-[70%]">
          <span className="block h-2 w-20 rounded-full bg-cyan-300/40" />
          <span className="mt-3 block h-7 w-full rounded-lg bg-white/90" />
          <span className="mt-2 block h-7 w-[78%] rounded-lg bg-white/80" />
          <span className="mt-4 block h-2 w-[86%] rounded-full bg-white/15" />
          <span className="mt-2 block h-2 w-[64%] rounded-full bg-white/10" />
          <div className="mt-5 flex gap-2">
            <span className="h-8 w-24 rounded-lg bg-violet-500" />
            <span className="h-8 w-24 rounded-lg border border-white/10 bg-white/[0.03]" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="h-16 rounded-xl border border-white/[0.06] bg-white/[0.025]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobilePreview() {
  return (
    <div className="mx-auto w-[136px] overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#090910] shadow-2xl shadow-black/70">
      <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-white/20" />
      <div className="px-3 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <span className="h-2 w-10 rounded-full bg-white/20" />
          <span className="h-4 w-4 rounded-full bg-violet-400/60" />
        </div>
        <span className="mt-8 block h-2 w-12 rounded-full bg-cyan-300/40" />
        <span className="mt-3 block h-5 w-full rounded-md bg-white/85" />
        <span className="mt-2 block h-5 w-[76%] rounded-md bg-white/70" />
        <span className="mt-4 block h-16 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-400/10 ring-1 ring-white/[0.06]" />
        <span className="mt-3 block h-9 rounded-lg bg-violet-500" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <span className="h-5 rounded-md bg-white/10" />
          <span className="h-5 rounded-md bg-white/10" />
          <span className="h-5 rounded-md bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function AdminPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#09090f] shadow-2xl shadow-black/50">
      <BrowserBar label="admin · acceso protegido" />
      <div className="grid grid-cols-[38px_1fr]">
        <div className="space-y-3 border-r border-white/[0.06] p-3">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="block h-3 w-3 rounded bg-white/10" />
          ))}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="h-2 w-16 rounded-full bg-white/20" />
            <span className="h-5 w-12 rounded-md bg-cyan-400/15 ring-1 ring-cyan-300/20" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <span key={item} className="h-10 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.05]" />
            ))}
          </div>
          <div className="mt-3 flex h-20 items-end gap-1 rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.05]">
            {[35, 62, 44, 78, 58, 86, 72].map((height, item) => (
              <span
                key={item}
                className="flex-1 rounded-t bg-gradient-to-t from-violet-500/45 to-cyan-300/65"
                style={{ height: String(height) + "%" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductHome() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030306] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 72% 18%, rgba(139,92,246,.12), transparent 30%), radial-gradient(circle at 48% 58%, rgba(34,211,238,.07), transparent 34%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <header className="relative z-20 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="VForge">
            <VWordmark />
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-1 sm:gap-3">
            <Link href="#producto" className="hidden rounded-lg px-3 py-2 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white sm:block">
              Producto
            </Link>
            <Link href="#seguridad" className="hidden rounded-lg px-3 py-2 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white sm:block">
              Seguridad
            </Link>
            <Link href="/sign-in" className="rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:bg-white/[0.08]">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1480px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(380px_.78fr)_minmax(640px_1.35fr)] lg:gap-12 lg:py-20">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 motion-safe:animate-pulse" />
              Visor privado en tiempo real
            </div>
            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[72px]">
              Tus proyectos, vivos. Frente a todos.
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-white/52 sm:text-lg">
              Mira desktop, móvil y panel administrativo al mismo tiempo. Invita a clientes, recibe comentarios y acompaña cada cambio sin soltar el control.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-cyan-50">
                Abrir VForge
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="#producto" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-5 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white">
                <Eye className="h-4 w-4" />
                Ver cómo funciona
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/38">
              <span className="inline-flex items-center gap-1.5"><CircleCheck className="h-3.5 w-3.5 text-emerald-300/70" /> Acceso por proyecto</span>
              <span className="inline-flex items-center gap-1.5"><CircleCheck className="h-3.5 w-3.5 text-emerald-300/70" /> Roles y caducidad</span>
              <span className="inline-flex items-center gap-1.5"><CircleCheck className="h-3.5 w-3.5 text-emerald-300/70" /> Actividad en vivo</span>
            </div>
          </div>

          <div id="producto" className="relative scroll-mt-24">
            <div aria-hidden className="absolute -inset-8 rounded-[40px] bg-violet-500/[0.055] blur-3xl" />
            <div className="relative overflow-hidden rounded-[26px] border border-white/[0.11] bg-[#07070c]/95 shadow-[0_40px_120px_rgba(0,0,0,.7)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/75">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)] motion-safe:animate-pulse" />
                    En línea
                  </div>
                  <span className="h-4 w-px bg-white/10" />
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40"><GitBranch className="h-3.5 w-3.5" /> main</span>
                  <span className="rounded-md border border-violet-300/15 bg-violet-400/[0.08] px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-violet-200/75">Production</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/40">
                  <div className="flex -space-x-1.5">
                    {["L", "C", "A"].map((letter) => (
                      <span key={letter} className="flex h-6 w-6 items-center justify-center rounded-full border border-[#07070c] bg-white/10 text-[8px] text-white/65">{letter}</span>
                    ))}
                  </div>
                  <span>3 invitados</span>
                </div>
              </div>

              <div className="grid gap-3 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_250px]">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_148px]">
                  <DesktopPreview />
                  <MobilePreview />
                  <div className="md:col-span-2">
                    <AdminPreview />
                  </div>
                </div>
                <aside className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xs font-medium text-white/75"><Activity className="h-4 w-4 text-cyan-300" /> Actividad en vivo</h2>
                    <span className="text-[9px] uppercase tracking-wider text-white/25">Ahora</span>
                  </div>
                  <div className="mt-5 space-y-5">
                    {activity.map(({ Icon, title, detail, tone }) => (
                      <div key={title} className="relative pl-7">
                        <span className="absolute left-[7px] top-6 h-[calc(100%+12px)] w-px bg-white/[0.06] last:hidden" />
                        <Icon className={"absolute left-0 top-0.5 h-4 w-4 " + tone} />
                        <p className="text-[11px] font-medium leading-4 text-white/70">{title}</p>
                        <p className="mt-1 text-[10px] leading-4 text-white/30">{detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <div className="flex items-center gap-2 text-[10px] text-white/50"><MessageSquare className="h-3.5 w-3.5 text-violet-300" /> Comentarios abiertos</div>
                    <div className="mt-3 h-9 rounded-lg border border-white/[0.07] bg-black/20" />
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-white/[0.012]">
          <div className="mx-auto grid max-w-[1280px] gap-px px-5 sm:px-8 md:grid-cols-3">
            {[
              { Icon: Monitor, title: "Tres ojos, una sola verdad", body: "Desktop, móvil y administración permanecen visibles dentro del mismo contexto." },
              { Icon: Users, title: "Invita sin soltar el control", body: "Observadores y revisores entran únicamente al proyecto y durante el tiempo que tú decides." },
              { Icon: GitBranch, title: "Del commit a la conversación", body: "Deploys, actividad y comentarios conviven en una bitácora que todos entienden." },
            ].map(({ Icon, title, body }) => (
              <article key={title} className="group border-white/[0.06] py-10 md:border-l md:px-8 first:md:border-l-0">
                <Icon className="h-5 w-5 text-cyan-200/65 transition group-hover:text-cyan-200" />
                <h2 className="mt-5 text-base font-medium text-white/88">{title}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="seguridad" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="flex flex-col justify-between gap-8 rounded-3xl border border-white/[0.08] bg-white/[0.022] p-7 sm:p-10 lg:flex-row lg:items-center">
            <div className="flex max-w-2xl gap-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[0.07]">
                <LockKeyhole className="h-5 w-5 text-violet-200/75" />
              </div>
              <div>
                <h2 className="text-xl font-medium tracking-tight">El cliente ve el proyecto, no tu infraestructura.</h2>
                <p className="mt-3 text-sm leading-6 text-white/42">Las vistas se entregan por alcance. Credenciales, servidores y herramientas operativas permanecen fuera del navegador.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-white/40">
              <span className="rounded-lg border border-white/[0.07] px-3 py-2">Owner</span>
              <span className="rounded-lg border border-white/[0.07] px-3 py-2">Reviewer</span>
              <span className="rounded-lg border border-white/[0.07] px-3 py-2">Observer</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 px-5 py-7 text-xs text-white/30 sm:flex-row sm:items-center sm:px-8">
          <span>VForge · Visor privado de proyectos</span>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className="transition hover:text-white/65">Privacidad</Link>
            <Link href="/terms" className="transition hover:text-white/65">Términos</Link>
            <Link href="https://github.com/turbillon50/vforge" className="transition hover:text-white/65">GitHub</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
