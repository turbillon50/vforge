import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProductHome from "@/components/marketing/ProductHome";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      const { userId } = await auth();
      if (userId) redirect("/app/projects");
    }
  } catch {}

  return <ProductHome />;
}
