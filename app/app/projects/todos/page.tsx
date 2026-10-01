import ProjectsCatalogClient from "@/components/projects/ProjectsCatalogClient";

export const dynamic = "force-dynamic";

/** Inventario completo (todos los proyectos registrados, incluidos los automáticos por repo). */
export default function TodosLosProyectosPage() {
  return <ProjectsCatalogClient />;
}
