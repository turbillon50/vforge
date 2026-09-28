import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClerkShell } from "@/components/auth/ClerkShell";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { AppProviders } from "@/i18n/AppProviders";
import SplashScreen from "@/components/SplashScreen";
import { LimiteDeError } from "@/components/system/LimiteDeError";

export const metadata: Metadata = {
  // `template`: cada pantalla pone su nombre y hereda la marca. Antes las 8
  // rutas del núcleo compartían este mismo título y todas las pestañas del
  // navegador decían lo mismo (MUST-500 §79).
  title: {
    default: "VForge — Sala de revisión de proyectos",
    template: "%s · VForge",
  },
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
        {/* MUST-500 §4: sin JavaScript el visitante no se queda adivinando.
            Anclado abajo: la portada tiene un encabezado `position:fixed` y arriba se encimaban. */}
        <noscript>
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              padding:
                "14px 20px calc(14px + env(safe-area-inset-bottom)) 20px",
              background: "#0A0A0A",
              color: "#FFFFFF",
              fontSize: 14,
              lineHeight: 1.5,
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            VForge necesita JavaScript para funcionar. Actívalo en tu navegador y
            vuelve a cargar la página. Si el problema sigue, escríbenos a{" "}
            <a
              href="mailto:luisdelator@vmomentums.info"
              style={{ color: "#FFFFFF", textDecoration: "underline" }}
            >
              luisdelator@vmomentums.info
            </a>
            .
          </div>
        </noscript>
        <LimiteDeError nombre="SplashScreen">
          <SplashScreen />
        </LimiteDeError>
        <AppProviders>
          <ClerkShell>{children}</ClerkShell>
        </AppProviders>
        <LimiteDeError nombre="RegisterSW">
          <RegisterSW />
        </LimiteDeError>
      </body>
    </html>
  );
}
