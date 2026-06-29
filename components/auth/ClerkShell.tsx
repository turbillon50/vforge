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
          colorTextSecondary: "#888",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-hanken), Hanken Grotesk, system-ui, sans-serif",
        },
        elements: {
          card: "bg-[#0d0d0f] border border-white/[0.08] shadow-none",
          formButtonPrimary:
            "bg-violet-600 hover:bg-violet-500 transition-colors shadow-none",
          // Social buttons — fondo claro para que todos los íconos sean visibles
          socialButtonsBlockButton:
            "bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition-colors",
          socialButtonsBlockButtonText: "text-[#e5e5e5] font-medium",
          socialButtonsBlockButtonArrow: "text-[#e5e5e5]",
          // X/Twitter específico: fondo blanco para que el logo negro sea visible
          socialButtonsBlockButton__x_twitter:
            "bg-white hover:bg-gray-100 border-transparent transition-colors",
          socialButtonsBlockButtonText__x_twitter: "text-[#000] font-medium",
          // Inputs
          formFieldInput:
            "bg-[#1a1a1f] border-white/[0.1] text-[#e5e5e5] focus:border-violet-500 transition-colors",
          formFieldLabel: "text-[#888] text-xs",
          // Divider
          dividerLine: "bg-white/[0.08]",
          dividerText: "text-[#444] text-xs",
          // Footer links
          footerActionLink: "text-violet-400 hover:text-violet-300",
          identityPreviewText: "text-[#e5e5e5]",
          // Header
          headerTitle: "text-[#e5e5e5] font-semibold",
          headerSubtitle: "text-[#666]",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
