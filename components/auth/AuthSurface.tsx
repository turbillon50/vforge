import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { IconArrowL, IconEye, IconLayout, IconShield } from "@/components/brand/VFIcons";

export function AuthSurface({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden flex-col justify-between bg-black p-10 text-white lg:flex xl:p-14">
        <Link href="/" aria-label="Volver a VForge">
          <VWordmark inverse />
        </Link>

        <div className="max-w-[620px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
            VForge · sala privada
          </p>
          <h1 className="mt-6 text-[clamp(3.2rem,6vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-white">
            Todo el proyecto, en una sola mirada.
          </h1>
          <div className="mt-10 grid grid-cols-3 border-y border-white/20 py-5">
            {[
              { icon: IconLayout, label: "Escritorio y móvil" },
              { icon: IconShield, label: "Admin por permiso" },
              { icon: IconEye, label: "Actividad real" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="border-r border-white/20 px-4 first:pl-0 last:border-r-0">
                <Icon size={16} />
                <p className="mt-3 text-[11px] leading-4 text-white/65">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45">
          Sin acceso a secretos ni infraestructura para invitados
        </p>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center px-5 py-12 sm:px-8">
        <Link
          href="/"
          className="absolute left-5 top-5 inline-flex items-center gap-2 text-[12px] text-[var(--fg-muted)] hover:text-black sm:left-8 sm:top-8"
        >
          <IconArrowL size={13} /> Volver
        </Link>

        <div className="w-full max-w-[410px]">
          <div className="mb-8 lg:hidden">
            <VWordmark />
          </div>
          <p className="mono-label">{eyebrow}</p>
          <h2 className="mt-3 text-[34px] font-semibold tracking-[-0.055em]">{title}</h2>
          <p className="mt-3 max-w-sm text-[14px] leading-6">{body}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
