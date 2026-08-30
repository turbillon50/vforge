import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ScopedWorkspaceHome } from "@/components/workspace/ScopedWorkspaceHome";
import { isOwnerUser } from "@/lib/auth/owner";
import { listUserConnections } from "@/lib/connect/user-vault";
import { listScopedProjects } from "@/lib/projects/scoped-catalog";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await currentUser().catch(() => null);
  const email =
    user?.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId,
    )?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!user || !email) redirect("/sign-in");
  if (isOwnerUser(user)) redirect("/app/chat");

  const name = user.firstName || user.username || "";
  const [projects, connections] = await Promise.all([
    listScopedProjects({ clerkUserId: user.id, email }).catch((error: unknown) => {
      console.error("[workspace] scoped catalog failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }),
    listUserConnections(user.id).catch((error: unknown) => {
      console.error("[workspace] connections failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }),
  ]);
  return (
    <ScopedWorkspaceHome
      name={name}
      email={email}
      projects={projects}
      connections={connections}
    />
  );
}
