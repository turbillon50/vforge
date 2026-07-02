/**
 * POST /api/forja/ojo/nueva — encola una tarea nueva (owner-only).
 * Body: { agent, project_id, prompt, priority }.
 */
import { isOwnerRequest, ojoPost } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["claude", "grok", "shell", "codex", "browser"];

export async function POST(req: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  let body: {
    agent?: string;
    project_id?: string;
    prompt?: string;
    priority?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "json_invalido" }, { status: 400 });
  }
  const agent = String(body.agent ?? "").toLowerCase();
  if (!ALLOWED.includes(agent)) {
    return Response.json({ error: "agent_invalido", permitidos: ALLOWED }, { status: 400 });
  }
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) {
    return Response.json({ error: "prompt_vacio" }, { status: 400 });
  }
  const priority = Number.isFinite(Number(body.priority)) ? Number(body.priority) : 5;
  try {
    const r = await ojoPost("nueva", {
      agent,
      project_id: (body.project_id ?? "").trim() || null,
      prompt,
      priority,
    });
    const data = await r.json();
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
