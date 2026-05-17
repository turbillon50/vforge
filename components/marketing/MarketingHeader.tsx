"use client";

import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const nav = [
    { href: "/#product", label: t.common.nav_product },
    { href: "/#workspace", label: t.common.nav_workspace },
    { href: "/marketplace", label: t.common.nav_marketplace },
    { href: "/glossary", label: t.common.nav_glossary },
    { href: "/pricing", label: t.common.nav_pricing },
  ];
  return (
    <header
      className="sticky top-0 z-40 border-b border-app bg-void/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-14 max-w-container items-center justify-between px-4 sm:h-16 sm:px-5 md:px-margin-desktop">
        <Link href="/" aria-label="VForge home" className="flex items-center gap-2">
          <VWordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-[12px] uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleToggle compact />
          <ThemeToggle compact />
          <Link href="/sign-in" className="btn-ghost">
            {t.common.cta_sign_in}
          </Link>
          <Link href="/sign-up" className="btn-primary">
            {t.common.cta_get_access}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleToggle compact />
          <ThemeToggle compact />
          <button
            aria-label="Toggle menu"
            className="rounded-md border border-app-strong p-2 text-on-surface"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-app bg-void/95 md:hidden">
          <div className="mx-auto flex max-w-container flex-col gap-1 px-5 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-on-surface-variant hover:bg-tint-2 hover:text-on-surface"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              <Link href="/sign-in" className="btn-ghost flex-1">
                {t.common.cta_sign_in}
              </Link>
              <Link href="/sign-up" className="btn-primary flex-1">
                {t.common.cta_get_access}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
