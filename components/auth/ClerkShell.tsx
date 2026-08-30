import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { esES } from "@clerk/localizations";
import { isClerkPublishableKey } from "@/lib/auth/clerk-key";

export const monochromeClerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#8a8a8f",
    colorBackground: "transparent",
    colorInputBackground: "rgba(255,255,255,0.04)",
    colorInputText: "#ffffff",
    colorNeutral: "#ffffff",
    colorDanger: "#e6e6e6",
    borderRadius: "10px",
    fontFamily: "var(--font-geist-sans), Geist, Arial, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-none p-0 gap-6",
    header: "hidden",
    socialButtonsBlockButton: "vf-social",
    socialButtonsBlockButtonText: "vf-social-txt",
    socialButtonsIconButton: "vf-social",
    socialButtonsProviderIcon: "vf-social-icon",
    dividerLine: "vf-divider-line",
    dividerText: "vf-divider-txt",
    formFieldLabel: "vf-label",
    formFieldInput: "vf-input",
    formButtonPrimary: "vf-primary",
    footerActionText: "vf-footer-txt",
    footerActionLink: "vf-footer-link",
    identityPreview: "border-white/15",
    logoBox: "hidden",
    footer: "bg-transparent",
  },
} as const;

export function ClerkShell({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!isClerkPublishableKey(publishableKey)) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={esES}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app/chat"
      signUpFallbackRedirectUrl="/app/chat"
      appearance={monochromeClerkAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
