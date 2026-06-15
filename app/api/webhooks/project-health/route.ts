/**
 * POST /api/webhooks/project-health — SISTEMA NERVIOSO de VULCANO.
 *
 * Cualquier app cliente del ecosistema (Castores, HapiCredit, V Momentum…)
 * le reporta a V su salud llamando a este endpoint. V escucha, registra,
 * alerta y aprende:
 *
 *   1. Recibe  { project_id, event_type, details, severity }
 *   2. Guarda en project_events (firma estable para contar repeticiones)
 *   3. severity >= 'high'  → avisa a Luis por WhatsApp al instante
 *   4. mismo error 3+ veces esta semana → sella una `lesson` automática
 *
 * Best-effort en alertas/lessons: si WhatsApp o el aprendizaje fallan, el
 * evento YA quedó guardado y el request responde 200. Nunca tumbamos la señal.
 */
import { brainSql as sql } from "@/lib/db/nervous";
import { notifyOwner } from "@/lib/whatsapp/notify";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;
type Severity = (typeof SEVERITIES)[number];
const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const ALERT_THRESHOLD = RANK.high; // severity >= high dispara WhatsApp
const REPEAT_WINDOW_DAYS = 7;
const REPEAT_LIMIT = 3; // 3+ veces esta semana → lesson automática

let _ensured = false;
async function ensureTable(): Promise<void> {
  if (_ensured) return;
  _ensured = true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS project_events (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  text NOT NULL,
        event_type  text NOT NULL,
        details     jsonb NOT NULL DEFAULT '{}'::jsonb,
        severity    text NOT NULL DEFAULT 'low',
        signature   text,
        ts          timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_events_sig ON project_events (signature)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_events_ts ON project_events (ts DESC)`;
  } catch (e) {
    console.error("[nervous] ensureTable falló:", e);
  }
}

/** Normaliza severity libre del cliente a uno de los 4 niveles. */
function normSeverity(raw: unknown): Severity {
  const s = String(raw ?? "low").toLowerCase().trim();
  if ((SEVERITIES as readonly string[]).includes(s)) return s as Severity;
  // sinónimos comunes que mandan las apps
  if (["crit", "fatal", "down", "outage", "emergency"].includes(s)) return "critical";
  if (["error", "err", "warn", "warning", "alert"].includes(s)) return "high";
  if (["info", "notice", "debug", "ok"].includes(s)) return "low";
  return "low";
}

/**
 * Firma estable del "dolor": event_type + el mensaje de error normalizado.
 * Permite contar repeticiones del MISMO problema aunque cambien timestamps/ids.
 */
function makeSignature(eventType: string, details: unknown): string {
  let core = "";
  if (details && typeof details === "object") {
    const d = details as Record<string, unknown>;
    core = String(d.error ?? d.message ?? d.msg ?? d.reason ?? d.code ?? "");
  } else if (typeof details === "string") {
    core = details;
  }
  // quita números, uuids y comillas para agrupar variantes del mismo error
  const norm = core
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const basis = `${eventType.toLowerCase().trim()}::${norm}`;
  return crypto.createHash("sha1").update(basis).digest("hex");
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const project_id = String(body.project_id ?? "").trim();
  const event_type = String(body.event_type ?? "").trim();
  if (!project_id || !event_type) {
    return Response.json(
      { ok: false, error: "project_id y event_type son requeridos" },
      { status: 400 },
    );
  }

  const severity = normSeverity(body.severity);
  // details puede llegar como objeto, string o nada → siempre lo guardamos jsonb
  const rawDetails = body.details ?? {};
  const details =
    typeof rawDetails === "object" && rawDetails !== null
      ? rawDetails
      : { message: String(rawDetails) };
  const signature = makeSignature(event_type, details);

  await ensureTable();

  // 1+2 — registrar la señal nerviosa
  let eventId: string | null = null;
  try {
    const rows = (await sql`
      INSERT INTO project_events (project_id, event_type, details, severity, signature)
      VALUES (${project_id}, ${event_type}, ${JSON.stringify(details)}::jsonb, ${severity}, ${signature})
      RETURNING id
    `) as Array<{ id: string }>;
    eventId = rows[0]?.id ?? null;
  } catch (e) {
    console.error("[nervous] insert falló:", e);
    return Response.json({ ok: false, error: "db_insert_failed" }, { status: 500 });
  }

  const out: Record<string, unknown> = { ok: true, id: eventId, severity };

  // 3 — alerta inmediata a Luis si duele fuerte
  if (RANK[severity] >= ALERT_THRESHOLD) {
    const detailStr = JSON.stringify(details).slice(0, 280);
    const msg =
      `🚨 *${severity.toUpperCase()}* — ${project_id}\n` +
      `Evento: ${event_type}\n` +
      `${detailStr}`;
    const wa = await notifyOwner(msg);
    out.alerted = wa.ok;
  }

  // 4 — mismo error 3+ veces esta semana → lesson automática en el Brain
  try {
    const cnt = (await sql`
      SELECT COUNT(*)::int AS n,
             COUNT(DISTINCT project_id)::int AS projects
      FROM project_events
      WHERE signature = ${signature}
        AND ts > now() - (${REPEAT_WINDOW_DAYS} || ' days')::interval
    `) as Array<{ n: number; projects: number }>;
    const n = cnt[0]?.n ?? 0;
    const projects = cnt[0]?.projects ?? 1;

    if (n >= REPEAT_LIMIT) {
      const fingerprint = `nervous:${signature}`;
      const exists = (await sql`
        SELECT 1 FROM lessons WHERE fingerprint = ${fingerprint} LIMIT 1
      `) as unknown[];

      if (exists.length === 0) {
        const scope =
          projects > 1
            ? `${projects} proyectos del ecosistema`
            : `el proyecto ${project_id}`;
        const lessonText =
          `El evento "${event_type}" se repitió ${n} veces en ${REPEAT_WINDOW_DAYS} días ` +
          `en ${scope}. Es un patrón recurrente, no un incidente aislado.`;
        const fix = `Revisar causa raíz de "${event_type}" — detalle típico: ${JSON.stringify(
          details,
        ).slice(0, 200)}`;
        // type ∈ ('acierto','error') por el CHECK del Brain — un error recurrente
        // es 'error'. El carácter "patrón" queda en source='nervous_system'.
        await sql`
          INSERT INTO lessons (project_id, type, area, lesson, fix, source, fingerprint, weight)
          VALUES (
            ${projects > 1 ? "ecosystem" : project_id},
            'error',
            ${event_type},
            ${lessonText},
            ${fix},
            'nervous_system',
            ${fingerprint},
            ${1.0 + Math.min(2.0, n * 0.2)}
          )
        `;
        out.lesson_created = true;

        // un patrón recurrente nuevo también merece aviso (best-effort)
        await notifyOwner(
          `🧠 Lección sellada — "${event_type}" se repitió ${n}× esta semana en ${scope}. ` +
            `V lo va a vigilar.`,
        );
      } else {
        // ya hay lección: refuerza su peso y marca uso
        await sql`
          UPDATE lessons
          SET hits = COALESCE(hits,0)+1,
              weight = LEAST(5.0, COALESCE(weight,1.0)+0.1),
              last_used_at = now()
          WHERE fingerprint = ${fingerprint}
        `;
      }
    }
  } catch (e) {
    console.error("[nervous] auto-lesson falló:", e);
  }

  return Response.json(out, { status: 200 });
}

/** GET — sonda de salud del propio sistema nervioso. */
export async function GET() {
  await ensureTable();
  try {
    const rows = (await sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE ts > now() - interval '24 hours')::int AS last_24h,
             COUNT(*) FILTER (WHERE severity IN ('high','critical')
                              AND ts > now() - interval '24 hours')::int AS critical_24h
      FROM project_events
    `) as Array<Record<string, number>>;
    return Response.json({ ok: true, stats: rows[0] ?? {} });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
