import { currentUser } from "@clerk/nextjs/server";
import { HomeExperience } from "@/components/workspace/home/HomeExperience";

export const dynamic = "force-dynamic";

/**
 * /workspace — HOGAR del cliente (no-owner). El middleware manda aquí a los
 * clientes desde zonas de owner (/app, /forge, /v). Antes hacía redirect a
 * /app/home y el middleware lo rebotaba de vuelta → loop/pantalla muerta.
 * Ahora renderiza el home real en su propia ruta permitida.
 */
export default async function WorkspacePage() {
  const user = await currentUser().catch(() => null);
  const name = user?.firstName || user?.username || "";
  return <HomeExperience name={name} />;
}
