/**
 * /app/live/[projectId] — portal en vivo del proyecto.
 */
import { loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { LivePortalRoot } from "@/components/live/LivePortalRoot";
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

  return <LivePortalRoot project={payload.project} me={payload.me} />;
}
