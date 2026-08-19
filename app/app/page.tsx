import { redirect } from "next/navigation";

// La conversación es el centro de VForge: /app aterriza directo en el chat.
export default function AppRoot() {
  redirect("/app/chat");
}
