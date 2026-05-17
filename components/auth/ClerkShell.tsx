import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

/**
 * ClerkShell wraps the app with ClerkProvider when a publishable key is present.
 * When no key is configured (preview builds), it renders children directly so the
 * marketing surface and shells can still be explored without auth keys.
 */
export function ClerkShell({ children }: { children: React.ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!pk) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={pk}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#0a0a0a",
          colorInputBackground: "#131313",
          colorInputText: "#e5e2e1",
          colorText: "#e5e2e1",
          colorTextSecondary: "#a3a0ad",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-hanken), Hanken Grotesk, system-ui, sans-serif",
        },
        elements: {
          card: "bg-surface border border-white/10 shadow-glow-violet",
          formButtonPrimary:
            "bg-gradient-to-r from-violet-600 to-cyan-400 hover:opacity-95",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
