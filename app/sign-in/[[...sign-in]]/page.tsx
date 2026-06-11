"use client";
export const dynamic = "force-dynamic";
import { SignIn } from "@clerk/nextjs";
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
          <p className="mt-1 text-sm text-white/40">Inicia sesión para acceder a tu fábrica de apps</p>
        </div>
        {clerkEnabled ? (
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-[#0e0c1a]/90 border border-white/[0.08] shadow-[0_0_80px_rgba(124,58,237,0.2)] backdrop-blur-2xl rounded-2xl",
                headerTitle: "text-white font-display font-bold",
                headerSubtitle: "text-white/40 text-sm",
                socialButtonsBlockButton: "border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white rounded-xl transition-all",
                dividerLine: "bg-white/[0.08]",
                dividerText: "text-white/25 font-mono text-[10px] uppercase tracking-widest",
                formFieldLabel: "text-white/60 text-xs font-medium",
                formFieldInput: "bg-white/[0.04] border border-white/[0.08] text-white rounded-xl focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/20",
                formButtonPrimary: "bg-gradient-to-r from-violet-600 to-violet-500 hover:brightness-110 text-white font-semibold rounded-xl shadow-[0_4px_20px_rgba(124,58,237,0.4)] transition-all",
                footerActionLink: "text-violet-400 hover:text-violet-300 font-medium",
                identityPreviewText: "text-white/70",
                identityPreviewEditButtonIcon: "text-white/40",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app"
          />
        ) : (
          <ClerkPlaceholder mode="sign-in" />
        )}
      </div>
    </div>
  );
}
