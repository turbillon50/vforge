import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Colectivo",
  description: "El chat real de la casa: Trío, V y Fábrica con todos los modelos.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
