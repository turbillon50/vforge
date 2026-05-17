"use client";

import Link from "next/link";
import { useT } from "@/i18n/AppProviders";

export function CTA() {
  const t = useT();
  return (
    <section className="relative">
      <div className="mx-auto max-w-container px-5 py-24 md:px-margin-desktop md:py-32">
        <div className="relative overflow-hidden rounded-3xl border border-app-strong bg-ink p-10 text-center md:p-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/30 blur-[120px]" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyber-cyan/20 blur-[120px]" />
          <span className="label-caps text-cyber-cyan">{t.marketing.cta_eyebrow}</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl text-balance">
            {t.marketing.cta_title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">{t.marketing.cta_body}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="btn-primary">
              {t.marketing.cta_primary}
            </Link>
            <Link href="/pricing" className="btn-ghost">
              {t.marketing.cta_secondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
