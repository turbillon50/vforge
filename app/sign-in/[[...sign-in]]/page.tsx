"use client";

import { SignIn, SignOutButton, useUser } from "@clerk/nextjs";
import { useClerkAppearance } from "@/lib/clerk-appearance";
import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { VWatermark } from "@/components/brand/VWatermark";
import { Sparkles } from "lucide-react";
import { useT } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";

export default function SignInPage() {
  const t = useT();
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const appearance = useClerkAppearance();
  const { isSignedIn, user } = useUser();

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <VWatermark />
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-violet-aura" />

      <header className="relative z-10 mx-auto flex max-w-container items-center justify-between px-5 py-6 md:px-margin-desktop">
        <Link href="/"><VWordmark /></Link>
        <div className="flex items-center gap-2">
          <LocaleToggle compact />
          <ThemeToggle compact />
          <Link
            href="/sign-up"
            className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-surface"
          >
            {t.auth.have_no_account}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-container flex-1 grid-cols-1 items-center gap-12 px-5 py-8 md:grid-cols-2 md:px-margin-desktop md:py-10">
        <section className="hidden md:flex flex-col justify-center">
          <span className="chip mb-5 border-violet-500/30 bg-violet-500/5 text-violet-200 w-fit">
            <Sparkles size={12} className="text-cyber-cyan" /> {t.auth.sign_in_eyebrow}
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
            {t.auth.sign_in_title}
          </h1>
          <p className="mt-4 max-w-md text-on-surface-variant">{t.auth.sign_in_subtitle}</p>
        </section>

        <section className="flex items-center justify-center">
          {hasClerk ? (
            isSignedIn ? (
              <ActiveSessionCard email={user?.primaryEmailAddress?.emailAddress} mode="sign-in" />
            ) : (
              <SignIn signUpUrl="/sign-up" forceRedirectUrl="/app" appearance={appearance} />
            )
          ) : (
            <ClerkPlaceholder mode="sign-in" />
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
        <button
          type="button"
          onClick={() => { window.location.href = "/app/chat"; }}
          className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 text-[15px] font-medium text-white shadow-glow-violet transition active:scale-[0.98] hover:opacity-95"
        >
          Ir a mi espacio
        </button>
        <SignOutButton redirectUrl={mode === "sign-up" ? "/sign-up" : "/sign-in"}>
          <button className="flex h-12 items-center justify-center rounded-xl border border-app bg-tint-1 px-5 text-[15px] text-on-surface transition active:scale-[0.98] hover:border-app-strong">
            Cerrar sesión y usar otra cuenta
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
