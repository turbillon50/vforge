"use client";
export const dynamic = "force-dynamic";
import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

export default function SignInPage() {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#03020a] px-5 py-16">
      {/* Aura background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[120px]"/>
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400/60 mb-2">VForge</p>
          <h1 className="font-display text-2xl font-bold text-white">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-[var(--fg-tertiary)]">Inicia sesión para acceder a tu fábrica de apps</p>
        </div>
        {clerkEnabled ? (
          <SignIn
            appearance={{
              baseTheme: dark,
              variables: { colorPrimary: "#8b5cf6", colorBackground: "transparent", borderRadius: "14px" },
              elements: {
                rootBox: "w-full",
                card: "bg-[#0e0c1a]/90 border border-[var(--border-1)] shadow-[0_0_80px_rgba(124,58,237,0.2)] backdrop-blur-2xl rounded-2xl",
                headerTitle: "text-white font-display font-bold",
                headerSubtitle: "text-[var(--fg-tertiary)] text-sm",
                socialButtonsBlockButton: "border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-secondary)] hover:bg-white/[0.07] hover:text-white rounded-xl transition-all",
                dividerLine: "bg-white/[0.08]",
                dividerText: "text-[var(--fg-muted)] font-mono text-[10px] uppercase tracking-widest",
                formFieldLabel: "text-[var(--fg-secondary)] text-xs font-medium",
                formFieldInput: "bg-[var(--surface-1)] border border-[var(--border-1)] text-white rounded-xl focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-[var(--fg-muted)]",
                formButtonPrimary: "bg-gradient-to-r from-violet-600 to-violet-500 hover:brightness-110 text-white font-semibold rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.4)] transition-all",
                footerActionLink: "text-violet-400 hover:text-violet-300 font-medium",
                identityPreviewText: "text-[var(--fg-secondary)]",
                identityPreviewEditButtonIcon: "text-[var(--fg-tertiary)]",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app/chat"
          />
        ) : (
          <ClerkPlaceholder mode="sign-in" />
        )}
      </div>
    </div>
  );
}
