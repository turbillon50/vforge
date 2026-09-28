import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Administración",
  description: "Panel de administración de VForge.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
