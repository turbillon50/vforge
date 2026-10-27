import { SpaceEditor } from "@/components/spaces/SpaceEditor";
export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  return <SpaceEditor projectId={(await params).id} />;
}
