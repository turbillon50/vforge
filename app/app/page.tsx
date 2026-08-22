import { redirect } from "next/navigation";

// El visor de proyectos es la puerta canónica del producto.
export default function AppRoot() {
  redirect("/app/projects");
}
