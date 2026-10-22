"use client";

export const dynamic = "force-dynamic";

import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import { AuthLoadingState } from "@/components/auth/AuthLoadingState";
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
          <ClerkLoading><AuthLoadingState mode="register" /></ClerkLoading>
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
