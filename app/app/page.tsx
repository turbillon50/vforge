import { redirect } from "next/navigation";

// El estudio conversacional es la puerta canónica del producto owner.
export default function AppRoot() {
  redirect("/app/chat");
}
