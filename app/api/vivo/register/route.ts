/**
 * POST /api/vivo/register — prepara un proyecto de VForge en el motor vivo.
 * Owner-only. Toma el repo de GitHub del proyecto (projects.github_repo) y le pide al
 * Hetzner que lo clone, instale y deje editable. Responde de inmediato; el avance se
 * lee en /api/vivo/status → preparando[projectId].
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { queryOne } from "@/lib/db/client";
import { registrarVivo } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Fila = { id: string; github_repo: string | null; github_default_branch: string | null };

export async function POST(request: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const projectId =
    cuerpo && typeof cuerpo === "object" && "projectId" in cuerpo
      ? String((cuerpo as { projectId: unknown }).projectId ?? "").trim()
      : "";
  if (!projectId) return Response.json({ error: "Falta projectId." }, { status: 400 });

  let fila: Fila | null = null;
  try {
    fila = await queryOne<Fila>(
      "SELECT id, github_repo, github_default_branch FROM projects WHERE id = $1 LIMIT 1",
      [projectId],
    );
  } catch {
    fila = null;
  }
  if (!fila) return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
  const repo = (fila.github_repo ?? "").replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return Response.json({ error: "Este proyecto no tiene repo de GitHub ligado." }, { status: 422 });
  }

  const nombre = fila.id.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
  try {
    const r = await registrarVivo(nombre, repo, fila.github_default_branch);
    return Response.json({ ...r, nombre }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 502 },
    );
  }
}
