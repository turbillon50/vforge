import { ClientShell } from "@/components/workspace/ClientShell";
import { ConexionesView } from "@/components/workspace/ConexionesView";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwnerUser } from "@/lib/auth/owner";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser().catch(() => null);
  if (isOwnerUser(user)) redirect("/app/integrations");
  return <ClientShell><ConexionesView /></ClientShell>;
}
