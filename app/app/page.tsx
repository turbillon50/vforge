import { redirect } from "next/navigation";

// Entrada del área autenticada: el ConnectionGate decide si setup o estudio.
// Empezamos en setup; si ya hay conexiones, el gate deja pasar al chat.
export default function AppRoot() {
  redirect("/app/setup");
}
