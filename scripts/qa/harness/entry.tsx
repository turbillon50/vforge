/**
 * Banco de pruebas de /app/projects.
 *
 * Monta la pantalla REAL (el mismo `app/app/projects/page.tsx` que se despliega)
 * con el catálogo REAL medido, fuera de Next. En este servidor el `next dev`
 * entrega el HTML pero el navegador nunca recibe el payload RSC (`__next_f`
 * llega vacío y la página no hidrata), así que probar la interacción dentro de
 * `next dev` aquí no mide nada. Esto sí: es el componente de verdad, con datos
 * de verdad, en WebKit.
 *
 * Lo arma y lo sirve `scripts/qa/servir-b4.mjs`.
 */
import { createRoot } from "react-dom/client";
import ProjectsPage from "@/app/app/projects/page";

const nodo = document.getElementById("root");
if (nodo) createRoot(nodo).render(<ProjectsPage />);
