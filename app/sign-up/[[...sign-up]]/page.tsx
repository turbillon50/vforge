"use client";
export const dynamic = "force-dynamic";
import { SignUp } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";

export default function SignUpPage() {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-16" style={{ background: "#000" }}>
      {/* Mesh morado sutil — igual al global */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(124,58,237,0.09) 0%, transparent 70%)",
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Header encima del card */}
        <div className="mb-7 text-center">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(124,58,237,0.7)" }}>
            VForge
          </p>
          <h1 className="font-display text-[1.6rem] font-bold" style={{ color: "#fff" }}>
            Empieza gratis
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Crea tu cuenta y despierta a V
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Sin tarjeta", "Deploy en segundos", "+200 skills listas"].map((b) => (
              <span
                key={b}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px]"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <span style={{ color: "#7c3aed" }}>✓</span> {b}
              </span>
            ))}
          </div>
        </div>

        {/* Clerk usa el appearance de ClerkShell — sin override local */}
        {clerkEnabled ? (
          <SignUp />
        ) : (
          <ClerkPlaceholder mode="sign-up" />
        )}
      </div>
    </div>
  );
}
