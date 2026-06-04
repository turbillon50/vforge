import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Hero } from "@/components/marketing/Hero";
import { Metodo } from "@/components/marketing/Metodo";
import { Integraciones } from "@/components/marketing/Integraciones";
import { CTA } from "@/components/marketing/CTA";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <Metodo />
        <Integraciones />
        <CTA />
      </main>
      <MarketingFooter />
    </>
  );
}
