/**
 * /app/live/[projectId] — Portal en vivo del proyecto (server component).
 *
 * Resuelve el acceso con el helper central (fail-closed). Si el usuario es
 * miembro (o platform owner) → renderiza el portal. Si no → gate que puede
 * aceptar una invitación (?invite=token). La membresía fina y el gating por
 * rol viven en el helper y en /api/live/*.
 */
import { resolveLiveAccess } from "@/lib/projects/access";
import { getProjectViewports } from "@/lib/projects/live-portal";
import { LivePortal } from "@/components/live/LivePortal";
import { LiveGate } from "@/components/live/LiveGate";

export const dynamic = "force-dynamic";

export default async function LivePortalPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await resolveLiveAccess(projectId);
  if (!access) {
    return <LiveGate projectId={projectId} />;
  }

  const project = await getProjectViewports(projectId);
  if (!project) {
    return <LiveGate projectId={projectId} />;
  }

  // El viewport admin es solo para owner/reviewer: no serialices la URL hacia
  // el cliente para un observer (defensa en profundidad, no solo ocultarlo en UI).
  const canSeeAdmin = access.role === "owner" || access.role === "reviewer";

  return (
    <LivePortal
      project={{
        id: project.id,
        name: project.name,
        status: project.status,
        desktop_url: project.desktop_url,
        mobile_url: project.mobile_url,
        admin_url: canSeeAdmin ? project.admin_url : null,
      }}
      me={{
        name: access.name,
        role: access.role,
        isPlatformOwner: access.isPlatformOwner,
      }}
    />
  );
}
