import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClerkShell } from "@/components/auth/ClerkShell";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { AppProviders } from "@/i18n/AppProviders";
import { ThemeBootScript } from "@/components/ThemeBootScript";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "VForge — Build and operate complete products through conversation",
  description:
    "VForge is an AI-native operational workspace. Create apps, generate frontend & backend, deploy, and orchestrate every service through conversation with B.",
  applicationName: "VForge",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VForge" },
  openGraph: {
    title: "VForge — Operate products through conversation",
    description:
      "An AI-native operational workspace. Frontend, backend, deployments, integrations and infrastructure — orchestrated by B.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${GeistSans.variable} ${GeistMono.variable} ${hanken.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeBootScript />
      </head>
      <body className="font-sans bg-void text-on-surface min-h-dvh scanlines">
        <AppProviders>
          <ClerkShell>{children}</ClerkShell>
        </AppProviders>
        <RegisterSW />
      </body>
    </html>
  );
}
