import { redirect } from "next/navigation";

// El chat clásico de /forge está unificado con /hub. Ambas rutas
// resuelven al mismo session_id en el servidor (scope="general"),
// así V comparte su memoria en cualquier lugar desde donde la
// abras. Una sola V, una sola conversación.
export default function ForgePage() {
  redirect("/hub");
}
