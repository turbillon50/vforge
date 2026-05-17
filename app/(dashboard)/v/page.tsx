import { redirect } from "next/navigation";

// /v ahora vive como página independiente, pero el chat principal con V
// es /hub. Redirigimos para evitar dos chats compitiendo.
export default function VPage() {
  redirect("/hub");
}
