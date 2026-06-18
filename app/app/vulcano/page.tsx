import type { Metadata } from "next";
import { VulcanoStatus } from "@/components/vulcano/VulcanoStatus";
export const metadata: Metadata = {
  title: "Navegador Vulcano — IA & Human",
  description: "Tu navegador remoto persistente. Inicias sesión una vez y los agentes reutilizan tus sesiones por CDP. Tú das el toque humano; Vulcano hace el resto.",
};
export default function Page() { return <VulcanoStatus/>; }
