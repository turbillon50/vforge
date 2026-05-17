"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { VWatermark } from "@/components/brand/VWatermark";
import { Sparkles } from "lucide-react";
import { useT } from "@/i18n/AppProviders";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

export default function SignUpPage() {
  const t = useT();
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <VWatermark />
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-violet-aura" />

      <header className="relative z-10 mx-auto flex max-w-container items-center justify-between px-5 py-6 md:px-margin-desktop">
        <Link href="/"><VWordmark /></Link>
        <div className="flex items-center gap-2">
          <LocaleToggle compact />
          <ThemeToggle compact />
          <Link
            href="/sign-in"
            className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-surface"
          >
            {t.auth.have_account}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-container grid-cols-1 gap-12 px-5 pb-20 md:grid-cols-2 md:px-margin-desktop md:pt-10">
        <section className="hidden md:flex flex-col justify-center">
          <span className="chip mb-5 border-cyan-400/30 bg-cyan-400/5 text-cyan-400 w-fit">
            <Sparkles size={12} className="text-violet-300" /> {t.auth.sign_up_eyebrow}
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
            {t.auth.sign_up_title}
          </h1>
          <p className="mt-4 max-w-md text-on-surface-variant">{t.auth.sign_up_subtitle}</p>
        </section>

        <section className="flex items-start justify-center">
          {hasClerk ? (
            <SignUp signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
          ) : (
            <ClerkPlaceholder mode="sign-up" />
          )}
        </section>
      </main>
    </div>
  );
}
