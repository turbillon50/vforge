import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import { isClerkPublishableKey } from "@/lib/auth/clerk-key";

export function ClerkShell({ children }: { children: React.ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!isClerkPublishableKey(pk)) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={pk}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app/projects"
      signUpFallbackRedirectUrl="/onboarding"
      localization={esMX}
      appearance={{
        variables: {
          colorPrimary: "#ff5c35",
          colorBackground: "#fffdf8",
          colorInputBackground: "#f7f5ef",
          colorInputText: "#1b1a17",
          colorText: "#1b1a17",
          colorTextSecondary: "#6f695f",
          colorDanger: "#b42318",
          borderRadius: "0.875rem",
          fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        },
        captcha: { theme: "light", language: "es-MX" },
        elements: {
          card: { boxShadow: "none" },
          socialButtonsBlockButton: {
            border: "1px solid #d9d4c9",
            background: "#ffffff",
            color: "#1b1a17",
            boxShadow: "none",
          },
          socialButtonsBlockButtonText: { color: "#1b1a17", fontWeight: 550 },
          formFieldInput: {
            border: "1px solid #d9d4c9",
            background: "#f7f5ef",
            color: "#1b1a17",
            boxShadow: "none",
          },
          formFieldLabel: { color: "#4f4a43", fontSize: "13px" },
          dividerLine: { background: "#ded9cf" },
          dividerText: { color: "#8a847a", fontSize: "12px" },
          footerActionLink: { color: "#d94725", fontWeight: 650 },
          headerTitle: { color: "#1b1a17", fontWeight: 650 },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
