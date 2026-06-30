import { currentUser } from "@clerk/nextjs/server";
import { ClientShell } from "@/components/workspace/ClientShell";
import { HomeExperience } from "@/components/workspace/home/HomeExperience";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await currentUser().catch(() => null);
  const name = user?.firstName || user?.username || "";
  return (
    <ClientShell>
      <HomeExperience name={name} />
    </ClientShell>
  );
}
