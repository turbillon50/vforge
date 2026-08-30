import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwnerUser } from "@/lib/auth/owner";
import { ForjaWorkspace } from "@/components/forja/ForjaWorkspace";

export const metadata = { title: "La Forja — VForge" };
export const dynamic = "force-dynamic";

export default async function ForjaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let owner = false;
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);
    owner = isOwnerUser(u);
  } catch {
    owner = false;
  }
  if (!owner) redirect("/workspace");

  return <ForjaWorkspace />;
}
