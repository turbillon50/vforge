import DemosCatalogClient from "@/components/projects/DemosCatalogClient";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { loadDemoProjects } from "@/lib/projects/cartera";

export const dynamic = "force-dynamic";

export default async function DemosPage() {
  const access = await resolveRequestOwner();
  if (!access.userId || !access.isOwner) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] px-page-sm py-14 md:px-page-md">
        <section className="mx-auto max-w-xl rounded-lg border border-[var(--border-1)] bg-white p-6 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Owner-only
          </p>
          <h1 className="mt-3 text-[24px] font-semibold text-black">Catalogo privado</h1>
          <p className="mt-2 text-[14px] text-[var(--fg-secondary)]">
            Las demos de VForge solo estan disponibles para el operador.
          </p>
        </section>
      </main>
    );
  }

  const demos = await loadDemoProjects().catch(() => []);
  return <DemosCatalogClient initialDemos={demos} />;
}
