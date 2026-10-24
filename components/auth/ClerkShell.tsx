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

// Account popovers sit over the light workspace, not the sign-in canvas.
export const accountClerkAppearance = {
  variables: {
    colorPrimary: "var(--color-ink)",
    colorText: "var(--color-ink)",
    colorTextSecondary: "var(--fg-secondary)",
    colorBackground: "var(--color-surface)",
    colorNeutral: "var(--color-ink)",
    colorInputBackground: "var(--color-surface)",
    colorInputText: "var(--color-ink)",
  },
  elements: {
    rootBox: "w-auto",
    avatarBox: "h-9 w-9",
    userButtonTrigger: "min-h-11 min-w-11",
    userButtonPopoverCard: "!bg-[var(--color-surface)] !text-[var(--color-ink)] !opacity-100 !z-[1000] border border-[var(--border-1)] shadow-xl",
    userButtonPopoverMain: "!bg-[var(--color-surface)]",
    userButtonPopoverActions: "!bg-[var(--color-surface)]",
    userButtonPopoverActionButton: "!text-[var(--color-ink)] min-h-11",
    userButtonPopoverActionButtonText: "!text-[var(--color-ink)]",
    userButtonPopoverActionButtonIcon: "!text-[var(--color-ink)]",
    userPreviewMainIdentifier: "!text-[var(--color-ink)]",
    userPreviewSecondaryIdentifier: "!text-[var(--fg-secondary)]",
    userButtonPopoverFooter: "!bg-[var(--color-background)] !text-[var(--fg-secondary)]",
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
      signInFallbackRedirectUrl="/workspace"
      signUpFallbackRedirectUrl="/workspace"
      appearance={monochromeClerkAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
