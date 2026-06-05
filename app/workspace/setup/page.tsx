import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ScopeWizard from "@/components/userspace/ScopeWizard";
import { getScope } from "@/lib/workspace/db";

export const metadata = { title: "Define tu alcance — VForge" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let initialScope = null;
  try {
    const row = await getScope(userId);
    initialScope = row?.scope ?? null;
  } catch {
    // sin DB en build/local: el wizard arranca vacío
  }

  return <ScopeWizard initialScope={initialScope} />;
}
