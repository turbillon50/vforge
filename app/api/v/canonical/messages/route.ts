import { requireVOwner } from "@/lib/v-chat/auth";
import { getVMessages } from "@/lib/v-chat/store";
import { sessionArtifacts } from "@/lib/v-canonical/artifacts";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  const id = new URL(req.url).searchParams.get("sessionId") || "";
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id))
    return Response.json({ error: "Sesión inválida." }, { status: 400 });
  try {
    const [messages, artifacts] = await Promise.all([
      getVMessages(id, undefined, 200),
      sessionArtifacts(id),
    ]);
    return Response.json(
      {
        messages: messages.map((m) => ({
          ...m,
          artifacts: artifacts[m.id] || [],
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudo recuperar la conversación." },
      { status: 503 },
    );
  }
}
