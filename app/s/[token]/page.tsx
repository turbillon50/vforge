import { notFound } from "next/navigation";
import { resolveShareToken } from "@/lib/projects/share-link";
import { PublicLiveRoom } from "@/components/live/PublicLiveRoom";

export const dynamic = "force-dynamic";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await resolveShareToken(token);
  if (!project) notFound();

  return <PublicLiveRoom project={project} />;
}
