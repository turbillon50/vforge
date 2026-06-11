import { JoinClient } from "./JoinClient";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <JoinClient projectId={projectId} />;
}
