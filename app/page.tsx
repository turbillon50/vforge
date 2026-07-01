import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Hero from "@/components/marketing/Hero";
import Metodo from "@/components/marketing/Metodo";
import Integraciones from "@/components/marketing/Integraciones";
import CTA from "@/components/marketing/CTA";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      const { userId } = await auth();
      if (userId) redirect("/app/chat");
    }
  } catch {}

  return (
    <div className="min-h-screen" style={{ background: "#050a14" }}>
      <MarketingHeader />
      <main>
        <Hero />
        <Metodo />
        <Integraciones />
        <CTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
