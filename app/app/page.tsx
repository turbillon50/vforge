import { redirect } from "next/navigation";

// Entrada autenticada: al estudio. Setup es opcional desde el menú.
export default function AppRoot() {
  redirect("/app/chat");
}
