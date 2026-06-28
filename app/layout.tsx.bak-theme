import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClerkShell } from "@/components/auth/ClerkShell";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { AppProviders } from "@/i18n/AppProviders";
import { ThemeBootScript } from "@/components/ThemeBootScript";
import SplashScreen from "@/components/SplashScreen";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "VForge — Construye y opera productos completos con una conversación",
  description:
    "VForge es un workspace operativo nativo de IA. Crea apps, genera frontend y backend, despliega y orquesta cada servicio conversando con V.",
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
    title: "VForge — Opera productos con una conversación",
    description:
      "Un workspace operativo nativo de IA. Frontend, backend, deployments, integraciones e infraestructura — orquestados por V.",
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
      className={`${GeistSans.variable} ${GeistMono.variable} ${hanken.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeBootScript />
      </head>
      <body className="font-sans bg-void text-on-surface min-h-dvh scanlines">
        <SplashScreen />
        <AppProviders>
          <ClerkShell>{children}</ClerkShell>
        </AppProviders>
        <RegisterSW />
      </body>
    </html>
  );
}
