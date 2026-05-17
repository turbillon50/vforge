"use client";

import { PageHeader } from "@/components/workspace/PageHeader";
import { MarketplaceGrid } from "@/components/workspace/MarketplaceGrid";
import { useT } from "@/i18n/AppProviders";

export default function MarketplacePage() {
  const t = useT();
  return (
    <>
      <PageHeader
        eyebrow={t.marketplace.eyebrow}
        title={t.marketplace.title_workspace}
        description={t.marketplace.body_workspace}
      />
      <MarketplaceGrid context="workspace" />
    </>
  );
}
