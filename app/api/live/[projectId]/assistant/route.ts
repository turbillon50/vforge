import { NextRequest, NextResponse } from "next/server";
import { askV } from "@/lib/forge/ask-v";
import {
  ROOM_CEREBRAS_MODEL,
  cerebrasTalkModel,
} from "@/lib/forge/ask-v-policy";
import { humanProviderLabel, ProviderUnavailable } from "@/lib/forge/provider-errors";
import {
  authorizeAgentRunAccess,
  selectAgentRepository,
} from "@/lib/live/agent-runs";
import { loadRoomContextBrief } from "@/lib/live/load-room-context";
import { listExpedienteEyes, saveProjectEye } from "@/lib/live/project-eyes";
import { pickExpedienteFrames } from "@/lib/live/expediente-vision";
import { parseChatAttachments } from "@/lib/live/chat-attachments";
import {
  factoryHandsBrief,
  persistRoomMemory,
} from "@/lib/live/v-factory-hands";
import { recordCerebrasPulse, todayCerebrasUsage } from "@/lib/forge/cerebras-pulse";
import {
  extractMemoryBlocks,
  getUserMemories,
  memoryPromptSection,
  saveUserMemory,
} from "@/lib/forge/user-memory";
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
  const attachments = parseChatAttachments(payload?.attachments);
  const message =
    typeof payload?.message === "string"
      ? payload.message.trim().slice(0, 6000)
      : "";
  const spoken =
    message || (attachments.length ? `Mira ${attachments.length} foto(s).` : "");
  const repository = selectAgentRepository(access, payload?.repository);
  if (!mode || spoken.length < 1)
    return json({ error: "invalid_message" }, 400);

  try {
    for (const file of attachments) {
      await saveProjectEye({
        projectId,
        source: "attach",
        note: file.name,
        image: file.data,
      }).catch((error) => {
        console.error("[project assistant] attach failed", error);
      });
    }
    const history = await projectAssistantHistory(projectId);
    const repoContext = repository
      ? `${repository.repo_full_name} (rama ${repository.default_branch || "main"})`
      : null;
    const roomContext = await loadRoomContextBrief(
      projectId,
      access.identity,
      req.signal,
    ).catch((error) => {
      console.error("[project assistant] room brief failed", { projectId, error });
      return null;
    });
    const hands = await factoryHandsBrief(projectId, spoken).catch(() => "");
    const memories = await getUserMemories(access.identity.userId).catch(() => []);
    const brief = [roomContext, hands, memoryPromptSection(memories)]
      .filter(Boolean)
      .join("\n\n");
    const images = pickExpedienteFrames(
      await listExpedienteEyes(projectId).catch(() => []),
      4,
    );
    const result = await askV({
      mode,
      projectId,
      repository: repoContext,
      message: spoken,
      history,
      preferredModel: cerebrasTalkModel(images.length > 0),
      roomContext: brief || null,
      images,
    });
    const extracted = extractMemoryBlocks(result.text);
    for (const memory of extracted.memories) {
      await saveUserMemory(access.identity.userId, memory.key, memory.value).catch(
        () => null,
      );
    }
    const reply = extracted.cleaned.slice(0, 12000);

    await saveProjectAssistantTurn({
      projectId,
      mode,
      userId: access.identity.userId,
      email: access.identity.email,
      userText: spoken,
      assistantText: reply,
      provider: result.provider,
      model: result.model,
      status: result.status,
      durationMs: result.durationMs,
    });
    await persistRoomMemory({
      projectId,
      userText: spoken,
      assistantText: reply.slice(0, 2000),
    }).catch(() => null);
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
      reply,
      provider: result.provider,
      model: result.model,
      status: result.status,
      durationMs: result.durationMs,
      notice: result.notice,
      usage: result.usage,
      translator: {
        provider: "cerebras",
        model: result.model,
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
