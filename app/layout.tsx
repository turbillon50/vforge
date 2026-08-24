import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClerkShell } from "@/components/auth/ClerkShell";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { AppProviders } from "@/i18n/AppProviders";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "VForge — Sala de revisión de proyectos",
  description:
    "Escritorio, móvil y administración en una sola sala. Revisa avances, actividad y comentarios sin entrar a la infraestructura del proyecto.",
  applicationName: "VForge",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VForge",
  },
  openGraph: {
    title: "VForge — Sala de revisión de proyectos",
    description:
      "Ve el proyecto en escritorio, móvil y administración; sigue la actividad e invita revisores con alcance controlado.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      data-theme="light"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-svh bg-background font-sans text-ink">
        <SplashScreen />
        <AppProviders>
          <ClerkShell>{children}</ClerkShell>
        </AppProviders>
        <RegisterSW />
      </body>
    </html>
  );
}
