import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Hero } from "@/components/marketing/Hero";
import { ProductCarousel } from "@/components/marketing/ProductCarousel";
import { Metodo } from "@/components/marketing/Metodo";
import { Integraciones } from "@/components/marketing/Integraciones";
import { Contratos } from "@/components/marketing/Contratos";
import { Credenciales } from "@/components/marketing/Credenciales";
import { CTA } from "@/components/marketing/CTA";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Usuario con sesión NO ve marketing: va directo a su casa.
  // El middleware decide owner (/app) vs usuario normal (/workspace).
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId } = await auth();
    if (userId) redirect("/app");
  }
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <ProductCarousel />
        <Metodo />
        <Integraciones />
        <Contratos />
        <Credenciales />
        <CTA />
      </main>
      <MarketingFooter />
    </>
  );
}
