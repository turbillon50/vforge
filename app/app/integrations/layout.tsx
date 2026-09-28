import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Conexiones",
  description: "GitHub, Vercel, modelos y MCP: qué está conectado y qué falta.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
