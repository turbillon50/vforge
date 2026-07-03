"use client";
export const dynamic = "force-dynamic";
import { SignUp, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";

const forgeAppearance = {
  variables: {
    colorPrimary: "#000000",
    colorText: "#1b1b1b",
    colorTextSecondary: "#6B7280",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#1b1b1b",
    colorDanger: "#b91c1c",
    borderRadius: "3px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { background: "#ffffff", border: "1px solid #e2e2e2", boxShadow: "none", borderRadius: "4px" },
    headerTitle: { color: "#1b1b1b", fontFamily: "'Inter', sans-serif", fontWeight: 600 },
    headerSubtitle: { color: "#6B7280" },
    socialButtonsBlockButton: {
      border: "1px solid #e2e2e2", background: "#ffffff", color: "#1b1b1b", boxShadow: "none",
      "&:hover": { background: "#f9f9f9" },
    },
    socialButtonsBlockButtonText: { color: "#1b1b1b", fontWeight: 500 },
    dividerLine: { background: "#eeeeee" },
    dividerText: { color: "#6B7280" },
    formFieldLabel: { color: "#1b1b1b", fontWeight: 500 },
    formFieldInput: {
      border: "1px solid #e2e2e2", background: "#ffffff", color: "#1b1b1b", boxShadow: "none",
      "&:focus": { border: "1px solid #1b1b1b", boxShadow: "none" },
    },
    formButtonPrimary: {
      background: "#000000", color: "#ffffff", boxShadow: "none", textTransform: "none" as const, fontWeight: 600,
      "&:hover": { background: "#1b1b1b" },
    },
    footerActionText: { color: "#6B7280" },
    footerActionLink: { color: "#000000", fontWeight: 600 },
    identityPreview: { border: "1px solid #e2e2e2" },
    logoBox: { display: "none" },
  },
} as const;

export default function SignUpPage() {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-5 py-16"
      style={{ background: "#ffffff", fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0" style={{ height: "2px", background: "#000000" }} aria-hidden />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <p
            className="mb-2 text-[10px] uppercase"
            style={{ color: "#6B7280", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.28em" }}
          >
            Forge — Onboard
          </p>
          <h1 className="text-[1.55rem] font-semibold" style={{ color: "#1b1b1b", letterSpacing: "-0.02em" }}>
            Create your account
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "#6B7280" }}>
            Start building with Forge
          </p>
        </div>
        {clerkEnabled ? (
          <>
            <ClerkLoading>
              <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4" style={{ background: "#ffffff" }}>
                <svg viewBox="0 0 24 24" width="34" height="34" className="animate-pulse" aria-hidden>
                  <path d="M2 3h20L12 21z" fill="#000000" />
                </svg>
                <p className="text-[10px] uppercase" style={{ color: "#6B7280", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em" }}>
                  Loading
                </p>
              </div>
            </ClerkLoading>
            <ClerkLoaded>
              <SignUp appearance={forgeAppearance} />
            </ClerkLoaded>
          </>
        ) : (
          <ClerkPlaceholder mode="sign-up" />
        )}
      </div>
    </div>
  );
}
