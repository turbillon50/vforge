import CarteraProjectsClient from "@/components/projects/CarteraProjectsClient";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { loadCarteraProjects, loadDemoProjects } from "@/lib/projects/cartera";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const access = await resolveRequestOwner();
  if (!access.userId || !access.isOwner) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] px-page-sm py-14 md:px-page-md">
        <section className="mx-auto max-w-xl rounded-lg border border-[var(--border-1)] bg-white p-6 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Owner-only
          </p>
          <h1 className="mt-3 text-[24px] font-semibold text-black">Cartera privada</h1>
          <p className="mt-2 text-[14px] text-[var(--fg-secondary)]">
            Esta vista solo se abre para el operador de VForge.
          </p>
        </section>
      </main>
    );
  }

  const [projects, demos] = await Promise.all([
    loadCarteraProjects().catch(() => []),
    loadDemoProjects().catch(() => []),
  ]);
  return <CarteraProjectsClient projects={projects} demos={demos} />;
}
