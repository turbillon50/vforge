import { Suspense } from "react";
import { ChatExperience } from "@/components/workspace/chat/ChatExperience";

// Suspense wrapper requerido por Next 15: ChatExperience usa
// useSearchParams() para leer ?project=ID&q=TEXTO de deep-links.
// Sin esto, el build estático falla con "missing-suspense-with-csr-bailout".
export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatExperience />
    </Suspense>
  );
}
