import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Tablero",
  description: "El estado de tus proyectos de un vistazo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
