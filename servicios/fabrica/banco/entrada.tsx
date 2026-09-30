/**
 * Banco de la Fábrica: monta la MISMA página /app/fabrica (sin copiarla) para
 * mirarla en WebKit sin Clerk. El servidor del banco contesta /api/fabrica/estado
 * con los JSON reales del colector (estado.json + trabajos.json del Hetzner).
 */
import { createRoot } from "react-dom/client";
import FabricaPage from "@/app/app/fabrica/page";

createRoot(document.getElementById("raiz")!).render(<FabricaPage />);
