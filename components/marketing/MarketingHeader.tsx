"use client";

import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { useState } from "react";
import { Menu, X, Share2 } from "lucide-react";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const nav = [
    { href: "/#metodo", label: "Método" },
    { href: "/marketplace", label: "V-Shop" },
    { href: "/pricing", label: "Precios" },
    { href: "/developers", label: "Developers", badge: "Soon" },
  ];

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "VForge", text: "La fábrica de apps con IA más potente.", url: "https://vforge.site" });
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText("https://vforge.site");
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#03020a]/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5">
        <Link href="/" className="shrink-0">
          <VWordmark />
        </Link>

        {/* Nav desktop */}
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white/90"
            >
              {item.label}
              {item.badge && (
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-300 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
          <button
            onClick={handleShare}
            className="hidden items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/40 transition hover:text-white/70 md:flex"
          >
            <Share2 size={12} /> Compartir
          </button>
          <Link
            href="/sign-in"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-white/50 transition hover:text-white md:block"
          >
            Entrar
          </Link>
          <Link
            href="/sign-up"
            className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] transition hover:shadow-[0_0_30px_rgba(124,58,237,0.55)] hover:scale-[1.02]"
          >
            Empezar
          </Link>
          <button
            className="rounded-xl border border-white/[0.08] p-2 text-white/50 transition hover:text-white md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/[0.06] bg-[#03020a]/95 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
                {item.badge && (
                  <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-300 uppercase">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/sign-in" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-center text-sm text-white/50">
                Entrar
              </Link>
              <Link href="/sign-up" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-2.5 text-center text-sm font-semibold text-white">
                Empezar
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
