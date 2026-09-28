import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Proyectos",
  description: "Todos tus proyectos: avance, entrega, repositorio y notas.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
