import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClerkShell } from "@/components/auth/ClerkShell";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { AppProviders } from "@/i18n/AppProviders";

export const metadata: Metadata = {
  title: "VForge — Todo el proyecto, en una sola mirada",
  description:
    "Una sala privada para revisar desktop, móvil y administración en tiempo real con clientes y equipo.",
  applicationName: "VForge",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VForge" },
  openGraph: {
    title: "VForge — Todo el proyecto, en una sola mirada",
    description:
      "Revisa desktop, móvil y administración desde una sola sala privada.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f1ea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Cuando el teclado soft aparece, redimensiona el VIEWPORT en vez de
  // overlay (iOS 16+ / Chrome Android). Esto hace que `h-dvh` y los
  // layouts flex shrinken correctamente, manteniendo el composer
  // pegado arriba del teclado sin necesidad de hacks JS.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans">
        <AppProviders>
          <ClerkShell>{children}</ClerkShell>
        </AppProviders>
        <RegisterSW />
      </body>
    </html>
  );
}
