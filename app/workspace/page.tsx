import Link from "next/link";

export const metadata = { title: "Tu workspace — VForge" };

/**
 * Placeholder del workspace para usuarios no-owner.
 * La experiencia completa (wizard de scope, asistente, blueprint)
 * llega en la fase 1B.
 */
export default function WorkspacePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-violet-300">
        VForge
      </p>
      <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold tracking-tight text-on-surface md:text-5xl">
        Tu espacio está en preparación
      </h1>
      <p className="mt-4 max-w-md text-balance text-on-surface-variant">
        Muy pronto vas a poder definir el alcance de tu aplicación y verla
        tomar forma aquí mismo. La construcción automatizada llega pronto.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-app bg-tint-1 px-6 py-2.5 text-sm text-on-surface transition hover:border-app-strong"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
