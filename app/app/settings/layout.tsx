import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Configuración",
  description: "Tu cuenta, tu plan y tus preferencias.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
