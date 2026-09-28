import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Actividad",
  description: "Lo que ha pasado en tus proyectos, en orden.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
