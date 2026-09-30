import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MonochromeHome } from "@/components/marketing/MonochromeHome";

export const metadata = {
  title: "Visión para tu IA",
  description:
    "Forge genera un MCP con tu propio acceso y lo conectas en tu IA: proyectos, GitHub, Vercel y secretos, sin salir del chat.",
  openGraph: {
    title: "Visión para tu IA",
    description:
      "Conecta tu IA a tus proyectos con el Model Context Protocol. Tus cuentas siguen siendo tuyas.",
    url: "https://vforge.site",
    siteName: "VForge",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visión para tu IA",
    description: "Conecta tu IA a tus proyectos con el Model Context Protocol.",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let userId: string | null = null;

  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      ({ userId } = await auth());
    }
  } catch {
    // La portada pública sigue disponible si Clerk no está configurado.
  }

  if (userId) redirect("/app/chat");

  return <MonochromeHome />;
}
