"use client";

export const dynamic = "force-dynamic";

import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import {
  monochromeClerkAppearance,
} from "@/components/auth/ClerkShell";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

export default function SignInPage() {
  const clerkEnabled = hasClerkPublishableKey();

  return (
    <AuthSurface
      eyebrow="Acceso"
      title="Entra a Forge"
      body="Plan. Integra. Ejecuta. Abre tus proyectos y conecta GitHub, Vercel y el resto cuando estés listo."
    >
      {clerkEnabled ? (
        <>
          <ClerkLoading>
            <div className="grid min-h-[380px] place-items-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                Cargando acceso
              </p>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <SignIn appearance={monochromeClerkAppearance} />
          </ClerkLoaded>
        </>
      ) : (
        <ClerkPlaceholder mode="sign-in" />
      )}
    </AuthSurface>
  );
}
