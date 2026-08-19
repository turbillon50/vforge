"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Check, Github, Plug, Triangle } from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

export const dynamic = "force-dynamic";

function ConnectionCard({
  name,
  description,
  icon,
  onClick,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-6 rounded-[20px] border border-[#d9d4c9] bg-white p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#1b1a17] text-white">{icon}</span>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em] text-[#1b1a17]">{name}</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#777168]">{description}</p>
        </div>
      </div>
      <button onClick={onClick} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#cfc9be] bg-[#f7f5ef] px-4 text-sm font-medium text-[#1b1a17] transition hover:border-[#ff5c35] hover:bg-[#fff3ef]">
        <Plug className="h-4 w-4" />Conectar
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  if (!hasClerkPublishableKey()) {
    return (
      <main className="vf-studio flex min-h-dvh items-center justify-center bg-[#f4f1ea] px-5 text-[#1b1a17]">
        <div className="max-w-md rounded-[22px] border border-[#d9d4c9] bg-white p-7 text-center">
          <p className="text-sm font-medium text-[#ff5c35]">Configuración pendiente</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Clerk no está configurado en este entorno.</h1>
          <p className="mt-3 text-sm leading-6 text-[#777168]">Agrega la clave pública para activar el acceso y el onboarding.</p>
        </div>
      </main>
    );
  }
  return <AuthenticatedOnboarding />;
}

function AuthenticatedOnboarding() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || !user) return null;

  const displayName = user.fullName || user.firstName || user.username || "Tu cuenta";
  const email = user.primaryEmailAddress?.emailAddress || "Cuenta verificada";

  return (
    <main className="vf-studio min-h-dvh bg-[#f4f1ea] text-[#1b1a17]">
      <header className="border-b border-[#d9d4c9] bg-[#f4f1ea]/95">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <button onClick={() => router.push("/")} aria-label="Volver al inicio" className="text-[#1b1a17]"><VWordmark /></button>
          <span className="text-sm text-[#777168]">Configuración inicial</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#ff5c35]">Preparar VForge</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[.95] tracking-[-0.065em] text-[#1b1a17] sm:text-6xl">Conecta solo lo indispensable.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#625e56]">VForge necesita ver tus repositorios y despliegues para reunir cada proyecto en una sala. Nada más. Puedes completar o cambiar estas conexiones después.</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[22px] bg-[#1b1a17] p-6 text-white">
            <p className="text-xs font-medium text-[#aaa49b]">Cuenta activa</p>
            <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff5c35] text-xl font-semibold text-white">{displayName.slice(0, 1).toUpperCase()}</div>
            <h2 className="mt-5 text-xl font-semibold text-white">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-[#aaa49b]">{email}</p>
            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="flex items-center gap-2 text-sm text-[#d9d4cb]"><Check className="h-4 w-4 text-[#69bf8d]" />Identidad verificada</p>
              <p className="mt-3 flex items-center gap-2 text-sm text-[#d9d4cb]"><Check className="h-4 w-4 text-[#69bf8d]" />Espacio privado listo</p>
            </div>
          </aside>

          <section className="space-y-4">
            <ConnectionCard name="GitHub" description="Importa repositorios y relaciona commits, ramas y cambios con cada proyecto." icon={<Github className="h-5 w-5" />} onClick={() => router.push("/api/auth/github/start")} />
            <ConnectionCard name="Vercel" description="Muestra previews, producción y estado de despliegues sin entregar acceso a tus clientes." icon={<Triangle className="h-5 w-5 fill-current" />} onClick={() => router.push("/api/auth/vercel/start")} />

            <div className="flex flex-col items-start justify-between gap-5 rounded-[20px] border border-[#d9d4c9] bg-[#ebe7df] p-5 sm:flex-row sm:items-center sm:p-6">
              <div><p className="text-sm font-semibold text-[#1b1a17]">Puedes entrar ahora</p><p className="mt-1 text-sm text-[#777168]">Si un proyecto ya existe, las conexiones se pueden resolver desde Ajustes.</p></div>
              <button onClick={() => router.push("/app/projects")} className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#ff5c35] px-5 text-sm font-semibold text-white transition hover:bg-[#e84a27]">Ver mis proyectos<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
