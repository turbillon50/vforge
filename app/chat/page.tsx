import { redirect } from "next/navigation";

// Experimentos trasladados a MIA; V permanece en las salas.
export default function RetiredChatPage() {
  redirect("/workspace");
}
