import Link from "next/link";
import { ArrowRight, Check, Eye, Lock, MessageCircle } from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";

function DesktopCanvas() {
  return (
    <div className="h-full overflow-hidden rounded-[14px] bg-[#fbfaf7] text-[#1b1a17]">
      <div className="flex h-9 items-center justify-between border-b border-[#dedbd3] px-3">
        <span className="text-[9px] font-semibold">Casa Olivo</span>
        <div className="flex gap-3 text-[7px] text-[#817b72]"><span>Proyecto</span><span>Galería</span><span>Contacto</span></div>
      </div>
      <div className="grid h-[calc(100%_-_36px)] grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col justify-end p-4">
          <span className="mb-2 text-[7px] font-semibold uppercase tracking-[0.16em] text-[#ff5c35]">Valle de Bravo</span>
          <span className="block text-[21px] font-semibold leading-[.95] tracking-[-0.06em]">Una casa para bajar el ritmo.</span>
          <span className="mt-3 block h-1.5 w-4/5 rounded-full bg-[#d8d4cc]" />
          <span className="mt-1.5 block h-1.5 w-3/5 rounded-full bg-[#e3e0d9]" />
          <span className="mt-4 block h-7 w-20 rounded-full bg-[#1b1a17]" />
        </div>
        <div className="m-2 rounded-[10px] bg-[#c9c3b7] p-2"><div className="h-full rounded-[7px] border border-white/50 bg-[#897f70]" /></div>
      </div>
    </div>
  );
}

function MobileCanvas() {
  return (
    <div className="mx-auto h-full w-full max-w-[126px] overflow-hidden rounded-[22px] border-[5px] border-[#24221f] bg-[#fbfaf7] text-[#1b1a17]">
      <div className="mx-auto mt-1.5 h-1 w-8 rounded-full bg-[#24221f]" />
      <div className="px-2.5 pb-3 pt-4">
        <div className="flex items-center justify-between text-[6px] font-semibold"><span>Casa Olivo</span><span>•••</span></div>
        <div className="mt-4 h-24 rounded-[9px] bg-[#897f70]" />
        <p className="mt-3 text-[11px] font-semibold leading-[1.05] tracking-[-0.04em]">Una casa para bajar el ritmo.</p>
        <div className="mt-3 h-6 rounded-full bg-[#ff5c35]" />
      </div>
    </div>
  );
}

function AdminCanvas() {
  return (
    <div className="h-full rounded-[12px] bg-[#fbfaf7] p-3 text-[#1b1a17]">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-semibold">Reservas</span>
        <span className="rounded-full bg-[#dff0e5] px-2 py-0.5 text-[6px] font-semibold text-[#27744a]">Activo</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["18", "74%", "$86k"].map((value) => (
          <div key={value} className="rounded-lg border border-[#e1ddd5] p-2">
            <span className="block text-[10px] font-semibold">{value}</span>
            <span className="mt-1 block h-1 w-8 rounded-full bg-[#d5d1c8]" />
          </div>
        ))}
      </div>
      <div className="mt-2 flex h-10 items-end gap-1 rounded-lg bg-[#efede7] p-2">
        {[32, 56, 42, 72, 64, 88, 77].map((height, index) => (
          <span key={index} className="flex-1 rounded-sm bg-[#ff7b5d]" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

function ReviewRoom() {
  return (
    <div id="sala" className="scroll-mt-24 rounded-[28px] bg-[#1b1a17] p-3 text-[#f7f4ed] shadow-[0_28px_80px_rgba(34,30,24,.18)] sm:p-4">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div><p className="text-[11px] font-medium text-[#f7f4ed]">Casa Olivo</p><p className="mt-0.5 text-[9px] text-[#918b82]">Sala de revisión</p></div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-[#d8d4cc]"><span className="h-1.5 w-1.5 rounded-full bg-[#62b987]" />En vivo</div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_152px]">
        <div className="h-[280px] sm:h-[360px]"><DesktopCanvas /></div>
        <div className="h-[280px] rounded-[16px] bg-[#11100f] p-3 sm:h-[360px]"><MobileCanvas /></div>
        <div className="h-[118px]"><AdminCanvas /></div>
        <div className="rounded-[16px] border border-white/10 p-3">
          <div className="flex items-center gap-2 text-[9px] text-[#b7b1a8]"><MessageCircle className="h-3 w-3" />Comentarios</div>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-white/[0.06] p-2 text-[8px] leading-3 text-[#d5d0c7]">El encabezado ya respira mejor.</div>
            <div className="rounded-lg bg-[#ff5c35] p-2 text-[8px] leading-3 text-white">Listo para revisión móvil.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductHome() {
  return (
    <div className="vf-studio min-h-screen bg-[#f4f1ea] text-[#1b1a17]">
      <header className="border-b border-[#d9d4c9]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="VForge" className="text-[#1b1a17]"><VWordmark /></Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-2">
            <Link href="#sala" className="hidden rounded-full px-4 py-2 text-sm text-[#716b62] transition hover:bg-white/70 hover:text-[#1b1a17] sm:block">Ver la sala</Link>
            <Link href="/sign-in" className="rounded-full bg-[#1b1a17] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ff5c35]">Entrar</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(360px,.72fr)_minmax(620px,1.28fr)] lg:gap-16 lg:px-12 lg:py-24">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[#ff5c35]">VForge · Sala privada de revisión</p>
            <h1 className="mt-7 text-balance text-[clamp(3.25rem,6.4vw,6.4rem)] font-semibold leading-[.88] tracking-[-0.075em] text-[#1b1a17]">Todo el proyecto, en una sola mirada.</h1>
            <p className="mt-7 max-w-lg text-pretty text-lg leading-8 text-[#625e56]">Escritorio, móvil y administración juntos. Tu equipo construye; tus clientes miran, comentan y entienden el avance sin entrar a tu infraestructura.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-in" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff5c35] px-6 text-sm font-semibold text-white transition hover:bg-[#e84a27]">Abrir VForge<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
              <Link href="#sala" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#cfc9be] bg-white/55 px-6 text-sm font-medium text-[#1b1a17] transition hover:bg-white"><Eye className="h-4 w-4" />Ver cómo se siente</Link>
            </div>
            <div className="mt-10 grid gap-3 text-sm text-[#625e56] sm:grid-cols-2">
              {["Invitados por proyecto", "Comentarios en contexto", "Actividad en tiempo real", "Acceso con alcance y caducidad"].map((item) => (
                <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#2f8c5c]" />{item}</span>
              ))}
            </div>
          </div>
          <ReviewRoom />
        </section>

        <section className="border-y border-[#d9d4c9] bg-[#ebe7df]">
          <div className="mx-auto grid max-w-[1220px] gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.1fr_.9fr] md:items-end lg:px-12">
            <div><p className="text-sm font-medium text-[#ff5c35]">Compartir sin exponer</p><h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#1b1a17] sm:text-5xl">Comparte la sala. No las llaves.</h2></div>
            <div>
              <p className="text-base leading-7 text-[#625e56]">Cada persona entra únicamente al proyecto y a las vistas que le corresponden. Credenciales, servidores y herramientas operativas se quedan fuera.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
                {[{ label: "Observa", Icon: Eye }, { label: "Comenta", Icon: MessageCircle }, { label: "Acceso protegido", Icon: Lock }].map(({ label, Icon }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-[#cfc9be] bg-[#f4f1ea] px-3 py-2"><Icon className="h-3.5 w-3.5" />{label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1220px] flex-col justify-between gap-4 px-5 py-8 text-xs text-[#777168] sm:flex-row sm:items-center sm:px-8 lg:px-12">
        <span>VForge · Proyectos a la vista</span>
        <nav aria-label="Legal" className="flex gap-5"><Link href="/privacy" className="hover:text-[#1b1a17]">Privacidad</Link><Link href="/terms" className="hover:text-[#1b1a17]">Términos</Link></nav>
      </footer>
    </div>
  );
}
