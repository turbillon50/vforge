import { NextRequest, NextResponse } from "next/server";
import { askV } from "@/lib/forge/ask-v";
import { ROOM_CEREBRAS_MODEL } from "@/lib/forge/ask-v-policy";
import { humanProviderLabel, ProviderUnavailable } from "@/lib/forge/provider-errors";
import {
  authorizeAgentRunAccess,
  selectAgentRepository,
} from "@/lib/live/agent-runs";
import { loadRoomContextBrief } from "@/lib/live/load-room-context";
import { recordCerebrasPulse, todayCerebrasUsage } from "@/lib/forge/cerebras-pulse";
import {
  listProjectAssistantMessages,
  projectAssistantHistory,
  saveProjectAssistantTurn,
  type ProjectAssistantMode,
} from "@/lib/live/project-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
    const usage = await todayCerebrasUsage().catch(() => null);
    return json({
      messages,
      canWrite: access.canWrite,
      repositories: access.repositories,
      translator: {
        provider: "cerebras",
        model: ROOM_CEREBRAS_MODEL,
        today: usage,
      },
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
      : null;
    const roomContext = await loadRoomContextBrief(
      projectId,
      access.identity,
      req.signal,
    ).catch(() => null);
    const result = await askV({
      mode,
      projectId,
      repository: repoContext,
      message,
      history,
      preferredModel: ROOM_CEREBRAS_MODEL,
      roomContext,
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
    await recordCerebrasPulse({
      projectId,
      ok: true,
      cause: result.status,
      durationMs: result.durationMs,
      usage: result.usage,
    }).catch(() => null);
    const usage = await todayCerebrasUsage().catch(() => null);
    const messages = await listProjectAssistantMessages(projectId);
    return json({
      messages,
      reply: result.text,
      provider: result.provider,
      model: result.model,
      status: result.status,
      durationMs: result.durationMs,
      notice: result.notice,
      usage: result.usage,
      translator: {
        provider: "cerebras",
        model: ROOM_CEREBRAS_MODEL,
        today: usage,
      },
    });
  } catch (caught) {
    const unavailable = caught instanceof ProviderUnavailable;
    console.error("[project assistant] response failed", {
      projectId,
      mode,
      provider: unavailable ? caught.provider : "unknown",
      cause: unavailable ? caught.cause : "unknown",
      durationMs: unavailable ? caught.durationMs : undefined,
    });
    await recordCerebrasPulse({
      projectId,
      ok: false,
      cause: unavailable ? caught.cause : "unknown",
      durationMs: unavailable ? caught.durationMs : 0,
    }).catch(() => null);
    return json(
      {
        error: "V no pudo responder en este momento.",
        notice: unavailable
          ? `${humanProviderLabel(caught.provider)} no disponible`
          : "GPT OSS no disponible",
        cause: unavailable ? caught.cause : "unknown",
      },
      502,
    );
  }
}
