import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MonochromeHome } from "@/components/marketing/MonochromeHome";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let userId: string | null = null;

  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      ({ userId } = await auth());
    }
  } catch {
    // La portada pública sigue disponible si Clerk no está configurado.
  }

  if (userId) redirect("/app/chat");

  return <MonochromeHome />;
}
