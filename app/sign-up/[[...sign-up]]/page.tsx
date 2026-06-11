"use client";
export const dynamic = "force-dynamic";
import { SignUp } from "@clerk/nextjs";
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
          <p className="mt-1 text-sm text-white/40">Crea tu cuenta y despierta a V</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {["Sin tarjeta","Deploy en segundos","17+ apps en producción"].map(b=>(
              <span key={b} className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1 font-mono text-[10px] text-white/35">
                <span className="text-emerald-400">✓</span> {b}
              </span>
            ))}
          </div>
        </div>
        {clerkEnabled ? (
          <SignUp
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
        <p className="mt-4 text-center text-[11px] text-white/20">
          Al registrarte aceptas nuestros{" "}
          <a href="/terms" className="text-violet-400/60 hover:text-violet-400 transition-colors">Términos</a>{" "}
          y{" "}
          <a href="/privacy" className="text-violet-400/60 hover:text-violet-400 transition-colors">Privacidad</a>
        </p>
      </div>
    </div>
  );
}
