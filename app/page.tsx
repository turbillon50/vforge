import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MobileChatLaunch } from "@/components/marketing/MobileChatLaunch";
import { MonochromeHome } from "@/components/marketing/MonochromeHome";

export const metadata = {
  title: "VForge — Chat profesional para apps",
  description:
    "VForge baja conversaciones reales a propuesta, preview, plantilla, repositorio y despliegue desde un chat profesional.",
  openGraph: {
    title: "VForge — Chat profesional para apps",
    description:
      "Del chat con tu cliente a una app lista para vender: propuesta, preview, repo, deploy y conectores.",
    url: "https://vforge.site",
    siteName: "VForge",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VForge — Chat profesional para apps",
    description: "Convierte conversaciones reales en propuesta, preview y despliegue.",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ua = (await headers()).get("user-agent") ?? "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|CriOS|FxiOS/i.test(ua);
  let userId: string | null = null;

  try {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      ({ userId } = await auth());
    }
  } catch {
    // La portada pública sigue disponible si Clerk no está configurado.
  }

  if (isMobile) return <MobileChatLaunch />;
  if (userId) redirect("/app/chat");

  return <MonochromeHome />;
}
