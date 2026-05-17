"use client";

import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { useT, interpolate } from "@/i18n/AppProviders";

export function MarketingFooter() {
  const t = useT();
  return (
    <footer
      className="border-t border-app bg-ink"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid max-w-container grid-cols-2 gap-8 px-4 py-10 sm:gap-12 sm:px-5 sm:py-16 md:grid-cols-4 md:px-margin-desktop">
        <div className="col-span-2 space-y-5">
          <VWordmark />
          <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">
            {t.marketing.footer_tagline}
          </p>
        </div>
        <div>
          <h4 className="label-caps mb-4 text-on-surface">{t.marketing.footer_platform}</h4>
          <ul className="space-y-3 text-sm text-on-surface-variant">
            <li><Link href="/#workspace" className="hover:text-cyber-cyan">{t.common.nav_workspace}</Link></li>
            <li><Link href="/marketplace" className="hover:text-cyber-cyan">{t.common.nav_marketplace}</Link></li>
            <li><Link href="/glossary" className="hover:text-cyber-cyan">{t.common.nav_glossary}</Link></li>
            <li><Link href="/pricing" className="hover:text-cyber-cyan">{t.common.nav_pricing}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="label-caps mb-4 text-on-surface">{t.marketing.footer_company}</h4>
          <ul className="space-y-3 text-sm text-on-surface-variant">
            <li><a className="hover:text-cyber-cyan" href="#">{t.marketing.footer_about}</a></li>
            <li><a className="hover:text-cyber-cyan" href="#">{t.marketing.footer_manifesto}</a></li>
            <li><a className="hover:text-cyber-cyan" href="#">{t.marketing.footer_security}</a></li>
            <li><a className="hover:text-cyber-cyan" href="#">{t.marketing.footer_contact}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-app">
        <div className="mx-auto flex max-w-container flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:px-5 sm:py-6 md:flex-row md:text-left md:px-margin-desktop">
          <p className="break-words font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:text-[11px] sm:tracking-[0.18em]">
            {interpolate(t.marketing.footer_legal, { year: new Date().getFullYear() })}
          </p>
          <p className="break-words font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:text-[11px] sm:tracking-[0.18em]">
            {t.marketing.footer_system}
          </p>
        </div>
      </div>
    </footer>
  );
}
