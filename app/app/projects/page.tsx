import ProjectsCatalogClient from "@/components/projects/ProjectsCatalogClient";
import {
  FeaturedProjectShell,
  TarjetaProyecto,
} from "@/components/unicorn/TarjetaProyecto";
import { loadVForgeExpediente } from "@/lib/unicorn/expediente";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const expediente = await loadVForgeExpediente().catch(() => null);

  return (
    <>
      {expediente ? (
        <FeaturedProjectShell>
          <TarjetaProyecto expediente={expediente} />
        </FeaturedProjectShell>
      ) : null}
      <ProjectsCatalogClient />
    </>
  );
}
