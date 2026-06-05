import { currentUser } from "@clerk/nextjs/server";
import { HomeExperience } from "@/components/workspace/home/HomeExperience";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  const user = await currentUser().catch(() => null);
  const name = user?.firstName || user?.username || "Luis";
  return <HomeExperience name={name} />;
}
