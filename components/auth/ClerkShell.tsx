import { ClerkProvider } from "@clerk/nextjs";
import { isClerkPublishableKey } from "@/lib/auth/clerk-key";

export const monochromeClerkAppearance = {
  variables: {
    colorPrimary: "#000000",
    colorText: "#090909",
    colorTextSecondary: "#73767b",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#090909",
    colorDanger: "#090909",
    borderRadius: "8px",
    fontFamily: "var(--font-geist-sans), Geist, Arial, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "border border-black/15 shadow-none",
    headerTitle: "font-semibold tracking-tight text-black",
    headerSubtitle: "text-neutral-500",
    socialButtonsBlockButton:
      "border-black/15 bg-white text-black shadow-none hover:bg-neutral-100",
    socialButtonsBlockButtonText: "font-medium text-black",
    dividerLine: "bg-black/10",
    dividerText:
      "font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500",
    formFieldLabel:
      "font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600",
    formFieldInput:
      "border-black/20 bg-white text-black shadow-none focus:border-black focus:ring-0",
    formButtonPrimary:
      "bg-black font-medium text-white shadow-none hover:bg-neutral-800",
    footerActionText: "text-neutral-500",
    footerActionLink: "font-medium text-black hover:text-neutral-600",
    identityPreview: "border-black/15",
    logoBox: "hidden",
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
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app/setup"
      signUpFallbackRedirectUrl="/app/setup"
      appearance={monochromeClerkAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
