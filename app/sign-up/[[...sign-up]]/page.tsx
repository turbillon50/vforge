"use client";

export const dynamic = "force-dynamic";

import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import {
  monochromeClerkAppearance,
} from "@/components/auth/ClerkShell";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

export default function SignUpPage() {
  const clerkEnabled = hasClerkPublishableKey();

  return (
    <AuthSurface
      eyebrow="Nueva cuenta"
      title="Crea tu acceso"
      body="Tu cuenta abre el workspace del proyecto. Los permisos de cada sala siguen separados por rol y alcance."
    >
      {clerkEnabled ? (
        <>
          <ClerkLoading>
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-[var(--border-1)] bg-white">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
                Preparando registro
              </p>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <SignUp appearance={monochromeClerkAppearance} />
          </ClerkLoaded>
        </>
      ) : (
        <ClerkPlaceholder mode="sign-up" />
      )}
    </AuthSurface>
  );
}
