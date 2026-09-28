import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Estudio",
  description: "Construye y opera tus proyectos conversando con V.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
