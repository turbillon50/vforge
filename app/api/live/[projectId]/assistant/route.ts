import { NextRequest, NextResponse } from "next/server";
import { askV, ProviderUnavailable } from "@/lib/forge/v-router";
import {
  authorizeAgentRunAccess,
  selectAgentRepository,
} from "@/lib/live/agent-runs";
import {
  listProjectAssistantMessages,
  projectAssistantHistory,
  saveProjectAssistantTurn,
  type ProjectAssistantMode,
} from "@/lib/live/project-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: noStore });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorizeAgentRunAccess(projectId, req.signal);
  if (!access) return json({ error: "not_found" }, 404);

  try {
    const messages = await listProjectAssistantMessages(projectId);
    return json({
      messages,
      canWrite: access.canWrite,
      repositories: access.repositories,
    });
  } catch (caught) {
    console.error("[project assistant] read failed", caught);
    return json({ error: "service_unavailable" }, 503);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorizeAgentRunAccess(projectId, req.signal);
  if (!access) return json({ error: "not_found" }, 404);
  if (!access.canWrite) return json({ error: "forbidden" }, 403);

  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const mode: ProjectAssistantMode | null =
    payload?.mode === "talk" || payload?.mode === "plan" ? payload.mode : null;
  const message =
    typeof payload?.message === "string"
      ? payload.message.trim().slice(0, 6000)
      : "";
  const repository = selectAgentRepository(access, payload?.repository);
  if (!mode || message.length < 1)
    return json({ error: "invalid_message" }, 400);

  try {
    const history = await projectAssistantHistory(projectId, mode);
    const repoContext = repository
      ? `${repository.repo_full_name} (rama ${repository.default_branch || "main"})`
      : "sin repositorio seleccionado";
    const modeRules =
      mode === "plan"
        ? `MODO PLANEACIÓN. Analiza y entrega un plan concreto, ordenado y verificable para el proyecto. No escribas código, no crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios. Señala decisiones, riesgos y criterios de aceptación. El usuario podrá convertir después este plan en una tarea de Ejecución.`
        : `MODO PLÁTICA. Conversa naturalmente sobre el proyecto, haz preguntas cuando falte contexto y ayuda a pensar. No crees ramas, no llames agentes y nunca afirmes que ejecutaste cambios.`;
    const prompt = `${modeRules}

SALA VFORGE: ${projectId}
REPOSITORIO AUTORIZADO: ${repoContext}

MENSAJE DEL USUARIO:
${message}`;
    const result = await askV({
      mode,
      projectId,
      repository: repository?.repo_full_name || null,
      message: prompt,
      history,
    });

    await saveProjectAssistantTurn({
      projectId,
      mode,
      userId: access.identity.userId,
      email: access.identity.email,
      userText: message,
      assistantText: result.text.slice(0, 12000),
      provider: result.provider,
      model: result.model,
      status: result.status,
      durationMs: result.durationMs,
    });
    const messages = await listProjectAssistantMessages(projectId);
    return json({
      messages,
      reply: result.text,
      provider: result.provider,
      model: result.model,
      status: result.status,
      durationMs: result.durationMs,
      systemNotice: result.systemNotice || null,
    });
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : String(caught);
    console.error("[project assistant] response failed", {
      projectId,
      mode,
      detail,
      providerUnavailable: caught instanceof ProviderUnavailable,
    });
    if (caught instanceof ProviderUnavailable) {
      return json(
        {
          error: "provider_unavailable",
          systemNotice: "Los proveedores de V no están disponibles en este momento.",
        },
        503,
      );
    }
    return json({ error: "V no pudo responder en este momento." }, 502);
  }
}
