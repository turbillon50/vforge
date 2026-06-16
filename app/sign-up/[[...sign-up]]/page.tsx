"use client";
export const dynamic = "force-dynamic";
import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

export default function SignUpPage() {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#03020a] px-5 py-16">
      {/* Aura */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[120px]"/>
        <div className="absolute left-1/2 top-[40%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/8 blur-[100px]"/>
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400/60 mb-2">VForge</p>
          <h1 className="font-display text-2xl font-bold text-white">Empieza gratis</h1>
          <p className="mt-1 text-sm text-[var(--fg-tertiary)]">Crea tu cuenta y despierta a V</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {["Sin tarjeta","Deploy en segundos","17+ apps en producción"].map(b=>(
              <span key={b} className="flex items-center gap-1 rounded-full border border-[var(--border-1)] bg-white/[0.025] px-3 py-1 font-mono text-[10px] text-[var(--fg-muted)]">
                <span className="text-emerald-400">✓</span> {b}
              </span>
            ))}
          </div>
        </div>
        {clerkEnabled ? (
          <SignUp
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
              },
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/onboarding"
          />
        ) : (
          <ClerkPlaceholder mode="sign-up" />
        )}
        <p className="mt-4 text-center text-[11px] text-[var(--fg-muted)]">
          Al registrarte aceptas nuestros{" "}
          <a href="/terms" className="text-violet-400/60 hover:text-violet-400 transition-colors">Términos</a>{" "}
          y{" "}
          <a href="/privacy" className="text-violet-400/60 hover:text-violet-400 transition-colors">Privacidad</a>
        </p>
      </div>
    </div>
  );
}
