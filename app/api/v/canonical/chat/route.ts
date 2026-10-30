import {
  validatePhotos,
  savePhotos,
  describePhotos,
  sessionPhotos,
  photoId,
  photoDescriptions,
} from "@/lib/v-canonical/images";
import { saveArtifacts, sessionArtifacts } from "@/lib/v-canonical/artifacts";
import { vTurnIds, OPERATOR_USER_ID } from "@/lib/v-chat/store";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { answerCanonical } from "@/lib/v-canonical/agent";
import {
  persistVTurn,
  getVMessages,
  getVTurn,
  makeVSessionId,
} from "@/lib/v-chat/store";
import { requireVOwner } from "@/lib/v-chat/auth";
import { safeHistory } from "@/lib/v-chat/continuity";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "no-store" };
const identifier = /^[a-zA-Z0-9_-]{1,120}$/;

export async function POST(req: NextRequest) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return NextResponse.json(
      { error: "Origen inválido." },
      { status: 403, headers },
    );
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 4300000)
      return NextResponse.json(
        { error: "Las fotos pesan demasiado." },
        { status: 413, headers },
      );
    body = JSON.parse(raw);
    validatePhotos(body.photos);
  } catch {
    return NextResponse.json(
      { error: "Mensaje inválido." },
      { status: 400, headers },
    );
  }
  if (
    !body ||
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 16000 ||
    (body.mode !== undefined &&
      body.mode !== "text" &&
      body.mode !== "voice") ||
    (body.session_id !== undefined &&
      (typeof body.session_id !== "string" ||
        !identifier.test(body.session_id))) ||
    (body.turn_id !== undefined &&
      (typeof body.turn_id !== "string" || !identifier.test(body.turn_id)))
  ) {
    return NextResponse.json(
      {
        error:
          "Revisa el mensaje y vuelve a enviarlo (máximo 16,000 caracteres).",
      },
      { status: 400, headers },
    );
  }
  const message = body.message.trim();
  const sessionId =
    body.session_id && !["default", "voice"].includes(body.session_id)
      ? body.session_id
      : makeVSessionId();
  const turnId = body.turn_id || randomUUID();
  const mode = body.mode === "voice" ? "voice" : "text";
  try {
    // The server is authoritative after a reload; the browser never replaces stored history.
    const stored = await getVMessages(sessionId, undefined, 40);
    const cached = await getVTurn(sessionId, turnId);
    if (cached) {
      const userId = vTurnIds(OPERATOR_USER_ID, sessionId, turnId)[0];
      const existing = (await sessionPhotos(sessionId))[userId] || [];
      const supplied = validatePhotos(body.photos)
        .map((p) => photoId(sessionId, userId, p.data))
        .sort();
      if (
        cached.userText !== message ||
        JSON.stringify(existing.map((p) => p.id).sort()) !==
          JSON.stringify(supplied)
      )
        return NextResponse.json(
          { error: "Este envío ya pertenece a otro mensaje." },
          { status: 409, headers },
        );
      return NextResponse.json(
        {
          ok: true,
          reply: cached.reply,
          photos: existing,
          assistant_id: vTurnIds(OPERATOR_USER_ID, sessionId, turnId)[1],
          artifacts:
            (await sessionArtifacts(sessionId))[
              vTurnIds(OPERATOR_USER_ID, sessionId, turnId)[1]
            ] || [],
          model: cached.model,
          persisted: true,
          mode,
          session_id: sessionId,
          turn_id: turnId,
        },
        { headers },
      );
    }
    const historicalArtifacts = stored.length
      ? await sessionArtifacts(sessionId)
      : {};
    const descriptions = await photoDescriptions(sessionId);
    const history = safeHistory(
      stored.length
        ? stored.map((m) => ({
            ...m,
            content:
              m.content +
              (descriptions[m.id]
                ? "\nAnálisis visual guardado de las fotos adjuntas: " +
                  descriptions[m.id]
                : "") +
              (historicalArtifacts[m.id]?.length
                ? "\nDatos de gráficas guardadas y verificadas por servidor (prevalecen sobre descripciones anteriores): " +
                  JSON.stringify(historicalArtifacts[m.id])
                : ""),
          }))
        : body.history,
    );
    const photos = await savePhotos(
      sessionId,
      vTurnIds(OPERATOR_USER_ID, sessionId, turnId)[0],
      validatePhotos(body.photos),
    );
    const visual = await describePhotos(photos, message);
    const result = await answerCanonical(
      message + visual,
      history,
      sessionId + ":" + turnId,
    );
    await persistVTurn({
      sessionId,
      turnId,
      userText: message,
      assistantText: result.reply,
      model: result.model,
    });
    const assistantId = vTurnIds(OPERATOR_USER_ID, sessionId, turnId)[1];
    await saveArtifacts(sessionId, assistantId, result.artifacts);
    const saved = await getVTurn(sessionId, turnId);
    if (!saved) throw new Error("V_STORAGE_UNAVAILABLE");
    return NextResponse.json(
      {
        ok: true,
        ...result,
        assistant_id: assistantId,
        photos,
        reply: saved.reply,
        model: saved.model,
        persisted: true,
        mode,
        session_id: sessionId,
        turn_id: turnId,
      },
      { headers },
    );
  } catch (err) {
    const engine =
      err instanceof Error && err.message === "V_ENGINE_UNAVAILABLE";
    console.error(
      "[V chat]",
      engine ? "engine_unavailable" : "continuity_unavailable",
    );
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message === "V_VISION_UNAVAILABLE"
            ? "El motor de visión no pudo leer las fotos. Conserva las imágenes y reintenta."
            : err instanceof Error && err.message === "V_IMAGE_INVALID"
              ? "No pude abrir una foto. Usa JPG, PNG o WebP de hasta 20 megapíxeles."
              : engine
                ? "V no pudo responder con sus motores disponibles. Tu mensaje sigue en el cuadro para reintentar."
                : "No pude confirmar que la conversación quedara guardada. Conserva el mensaje y reintenta.",
        persisted: false,
        session_id: sessionId,
        turn_id: turnId,
      },
      { status: 503, headers },
    );
  }
}
