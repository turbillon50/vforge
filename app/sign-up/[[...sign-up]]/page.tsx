"use client";

import { SignUp, SignOutButton, useUser } from "@clerk/nextjs";
import { useClerkAppearance } from "@/lib/clerk-appearance";
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
  const appearance = useClerkAppearance();
  const { isSignedIn, user } = useUser();

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
          {hasClerk && isSignedIn ? (
            <ActiveSessionCard email={user?.primaryEmailAddress?.emailAddress} mode="sign-up" />
          ) : hasClerk ? (
            <SignUp signInUrl="/sign-in" forceRedirectUrl="/onboarding" appearance={appearance} />
          ) : (
            <ClerkPlaceholder mode="sign-up" />
          )}
        </section>
      </main>
    </div>
  );
}


function ActiveSessionCard({ email, mode }: { email?: string; mode: "sign-in" | "sign-up" }) {
  return (
    <div className="surface-deep w-full max-w-md rounded-2xl border border-app bg-surface/80 p-8 backdrop-blur-xl">
      <h2 className="font-display text-xl font-semibold tracking-tight text-on-surface">
        Ya tienes una sesión abierta
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        Estás dentro como <span className="font-medium text-on-surface">{email ?? "tu cuenta"}</span>.
        {mode === "sign-up"
          ? " Para crear una cuenta nueva, primero cierra esta sesión."
          : " No necesitas iniciar sesión de nuevo."}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/app"
          className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 text-[15px] font-medium text-white shadow-glow-violet transition hover:opacity-95"
        >
          Ir a mi espacio
        </Link>
        <SignOutButton redirectUrl={mode === "sign-up" ? "/sign-up" : "/sign-in"}>
          <button className="flex h-11 items-center justify-center rounded-xl border border-app bg-tint-1 px-5 text-[15px] text-on-surface transition hover:border-app-strong">
            Cerrar sesión y usar otra cuenta
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
