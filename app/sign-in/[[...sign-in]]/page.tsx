"use client";
export const dynamic = "force-dynamic";
import { SignIn } from "@clerk/nextjs";
import { useClerkAppearance } from "@/lib/clerk-appearance";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";

function SignInWithTheme() {
  const appearance = useClerkAppearance();
  return <SignIn appearance={appearance} />;
}

export default function SignInPage() {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-16" style={{ background: "#000" }}>
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(124,58,237,0.09) 0%, transparent 70%)",
        }} />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 text-center">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(124,58,237,0.7)" }}>
            VForge
          </p>
          <h1 className="font-display text-[1.6rem] font-bold" style={{ color: "#fff" }}>
            Bienvenido de vuelta
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Inicia sesión para acceder a tu stack
          </p>
        </div>
        {clerkEnabled ? <SignInWithTheme /> : <ClerkPlaceholder mode="sign-in" />}
      </div>
    </div>
  );
}
