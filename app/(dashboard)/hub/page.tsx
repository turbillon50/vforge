import { ChatV3 } from "@/components/v3/chat";

export const metadata = {
  title: "V · Chat | vForge",
  description:
    "Conversa con V — tu agente autónomo. Memoria completa, tools cableadas, skills cargadas.",
};

/**
 * /hub — la landing del dashboard. V es el centro.
 *
 * El chat ocupa todo el viewport bajo el shell, con composer fijo
 * abajo y rehidratación automática de historial desde
 * /api/forge/conversations (V nunca empieza de cero).
 */
export default function HubPage() {
  return <ChatV3 />;
}
