import { ClientPortal } from "@/components/portal/ClientPortal";

export const dynamic = "force-dynamic";

export default async function ProjectPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientPortal projectId={id} />;
}
