import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vForge — Build · Deploy · Evolve",
  description:
    "El sistema operativo para crear y controlar tus aplicaciones como una fábrica.",
  applicationName: "vForge",
  authors: [{ name: "Luis Humberto de la Torre Herrera" }],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className="antialiased">{children}</body>
    </html>
  );
}
