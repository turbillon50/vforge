"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketplaceGrid } from "@/components/workspace/MarketplaceGrid";
import { useT } from "@/i18n/AppProviders";

export default function PublicMarketplacePage() {
  const t = useT();
  return (
    <>
      <MarketingHeader />
      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-violet-aura" />
        <div className="mx-auto max-w-container px-5 pt-16 md:px-margin-desktop md:pt-24">
          <div className="max-w-2xl">
            <span className="label-caps text-cyber-cyan">{t.marketplace.eyebrow}</span>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              {t.marketplace.title_public}
            </h1>
            <p className="mt-4 text-on-surface-variant">{t.marketplace.body_public}</p>
          </div>
        </div>
        <MarketplaceGrid context="marketing" />
      </main>
      <MarketingFooter />
    </>
  );
}
