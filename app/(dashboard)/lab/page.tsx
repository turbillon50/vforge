import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AgentMonitor from "@/components/lab/AgentMonitor";

export const metadata = { title: "Agent Lab — VForge" };

export default async function LabPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <AgentMonitor />;
}
