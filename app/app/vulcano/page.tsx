import type { Metadata } from "next";
import { VulcanoBrowser } from "@/components/vulcano/VulcanoBrowser";
export const metadata: Metadata = {
  title: "Navegador Vulcano — IA & Human",
  description: "Tu navegador remoto operado por IA, con relevo humano para logins, registros y pagos. Tú das el toque humano. Vulcano hace el resto.",
};
export default function Page() { return <VulcanoBrowser/>; }
