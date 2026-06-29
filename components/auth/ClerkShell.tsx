import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
      signInFallbackRedirectUrl="/app/chat"
      signUpFallbackRedirectUrl="/onboarding"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#0d0d0f",
          colorInputBackground: "#1a1a1f",
          colorInputText: "#e5e5e5",
          colorText: "#e5e5e5",
          colorTextSecondary: "#777",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-hanken), Hanken Grotesk, system-ui, sans-serif",
        },
        elements: {
          card: "shadow-none",

          // ── Social buttons base: borde sutil, fondo muy oscuro ──
          socialButtonsBlockButton:
            "border transition-colors",
          socialButtonsBlockButtonText: "font-medium",

          // ── X/Twitter: fondo blanco para que el logo negro sea legible ──
          // Clerk renderiza el SVG de X en negro nativo, necesita fondo claro
          socialButtonsBlockButton__x_twitter:
            "!bg-white !border-white/20 hover:!bg-gray-100 transition-colors",
          socialButtonsBlockButtonText__x_twitter:
            "!text-black font-medium",

          // ── Inputs ──
          formFieldInput:
            "border-white/[0.1] focus:border-violet-500 transition-colors",
          formFieldLabel: "text-xs",

          // ── Divider ──
          dividerLine: "bg-white/[0.08]",
          dividerText: "text-xs",

          // ── Footer ──
          footerActionLink: "text-violet-400 hover:text-violet-300",
          headerTitle: "font-semibold",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
