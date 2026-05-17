import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Hero } from "@/components/marketing/Hero";
import { Problem } from "@/components/marketing/Problem";
import { Capabilities } from "@/components/marketing/Capabilities";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { WorkspacePreview } from "@/components/marketing/WorkspacePreview";
import { CTA } from "@/components/marketing/CTA";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <Problem />
        <Capabilities />
        <HowItWorks />
        <WorkspacePreview />
        <CTA />
      </main>
      <MarketingFooter />
    </>
  );
}
