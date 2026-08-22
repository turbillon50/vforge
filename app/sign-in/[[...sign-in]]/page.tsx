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
      eyebrow="Acceso a la sala"
      title="Entra a VForge"
      body="Abre tus proyectos, revisa las tres vistas y comparte avances con cada invitado autorizado."
    >
      {clerkEnabled ? (
        <>
          <ClerkLoading>
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-[var(--border-1)] bg-white">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
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
