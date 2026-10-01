import ProjectsCatalogClient from "@/components/projects/ProjectsCatalogClient";
import {
  FeaturedProjectShell,
  TarjetaProyecto,
} from "@/components/unicorn/TarjetaProyecto";
import { loadGroupedProjectExpedientes } from "@/lib/unicorn/expediente";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const expedientes = await loadGroupedProjectExpedientes().catch(() => []);

  return (
    <>
      {expedientes.length ? (
        <FeaturedProjectShell
          kicker="Con repos ligados · los 12 más activos"
          title="Tus proyectos"
        >
          <div className="grid gap-5">
            {expedientes.map((expediente) => (
              <TarjetaProyecto key={expediente.project.id} expediente={expediente} />
            ))}
          </div>
        </FeaturedProjectShell>
      ) : null}
      <ProjectsCatalogClient />
    </>
  );
}
