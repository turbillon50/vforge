import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Hero } from "@/components/marketing/Hero";
import { Metodo } from "@/components/marketing/Metodo";
import { CTA } from "@/components/marketing/CTA";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <Metodo />
        <CTA />
      </main>
      <MarketingFooter />
    </>
  );
}
