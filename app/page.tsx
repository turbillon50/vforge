import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Hero } from "@/components/marketing/Hero";
import { Metodo } from "@/components/marketing/Metodo";
import { Integraciones } from "@/components/marketing/Integraciones";
import { Credenciales } from "@/components/marketing/Credenciales";
import { CTA } from "@/components/marketing/CTA";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      const { userId } = await auth();
      if (userId) redirect("/app/chat");
    }
  } catch {}

  return (
    <div className="min-h-screen" style={{ background: "#000" }}>
      <MarketingHeader />
      <main>
        <Hero />
        <Metodo />
        <Integraciones />
        <Credenciales />
        <CTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
