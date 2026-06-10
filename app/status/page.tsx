import type { Metadata } from "next";
import { TallerDashboard } from "@/components/status/TallerDashboard";
export const metadata: Metadata = {
  title: "Taller Vulcano — En vivo",
  description: "Tablero en tiempo real del taller Vulcano: procesos IA activos, CPU/RAM, esferas y proyectos del Brain.",
};
export default function Page() { return <TallerDashboard/>; }
