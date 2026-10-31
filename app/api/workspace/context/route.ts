import { currentPersonalActor, listPersonalSpaces } from "@/lib/workspace/personal";
import { personalSpaceHref } from "@/lib/workspace/personal-policy";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await currentPersonalActor();
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const spaces = await listPersonalSpaces(actor);
    const choices = spaces.map((s) => ({ id: s.id, name: `${s.name} · ${s.assistant_name}`, href: personalSpaceHref(s.id) }));
    if (actor.isPlatformOwner) choices.unshift({ id: "factory", name: "Luis · Fábrica completa", href: "/app/projects" });
    if (!choices.length) choices.push({ id: "personal", name: "Mi espacio", href: "/workspace" });
    return Response.json({ choices, canSeeFactory: actor.isPlatformOwner }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No se pudieron verificar los espacios" }, { status: 503 });
  }
}
