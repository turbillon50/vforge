/**
 * /app/live/[projectId] — portal en vivo del proyecto.
 *
 * La identidad se resuelve en el BFF de Next y los datos/roles se obtienen de
 * la API propia de VForge en Hetzner. El token interno nunca llega al browser.
 */
import { loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { LivePortal } from "@/components/live/LivePortal";
import { LiveGate } from "@/components/live/LiveGate";

export const dynamic = "force-dynamic";

export default async function LivePortalPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const payload = await loadVForgeLiveProject(projectId);

  if (!payload) {
    return <LiveGate projectId={projectId} />;
  }

  return <LivePortal project={payload.project} me={payload.me} />;
}
