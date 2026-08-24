import webpush from "web-push";
import { neon } from "@neondatabase/serverless";
import { OWNER_EMAILS } from "@/lib/auth/owner";

let configured = false;

function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) throw new Error("VAPID keys no configuradas");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:luisdelator@vmomentums.info",
    pub,
    priv,
  );
  configured = true;
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return neon(url);
}

export async function ensurePushTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id text PRIMARY KEY,
      clerk_user_id text NOT NULL,
      endpoint text NOT NULL UNIQUE,
      p256dh text NOT NULL,
      auth text NOT NULL,
      email text,
      created_at timestamptz DEFAULT now()
    )
  `;
  // columnas nuevas en installs antiguas
  await sql()`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS email text`;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

async function deliver(
  subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
): Promise<number> {
  configure();
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || "/app",
        }),
      );
      sent++;
    } catch (e: unknown) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await sql()`DELETE FROM push_subscriptions WHERE id = ${s.id}`;
      }
    }
  }
  return sent;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  await ensurePushTable();
  const subs = (await sql()`
    SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
     WHERE clerk_user_id = ${userId}
  `) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;
  return deliver(subs, payload);
}

/**
 * Notifica a todos los owners de plataforma que tengan push activo
 * (por email canónico o por cualquier suscripción marcada owner).
 */
export async function sendPushToOwners(payload: PushPayload): Promise<number> {
  try {
    await ensurePushTable();
    const emails = OWNER_EMAILS.map((e) => e.toLowerCase());
    if (emails.length === 0) return 0;

    const subs = (await sql()`
      SELECT DISTINCT ON (endpoint) id, endpoint, p256dh, auth
        FROM push_subscriptions
       WHERE lower(coalesce(email, '')) = ANY(${emails})
          OR clerk_user_id IN (
               SELECT clerk_user_id FROM push_subscriptions
                WHERE lower(coalesce(email, '')) = ANY(${emails})
             )
    `) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;

    // Fallback: si no hay email guardado, no spameamos a todos — 0.
    // El owner debe opt-in una vez con la sesión owner.
    return deliver(subs, payload);
  } catch (err) {
    console.error("[push] sendPushToOwners failed", err);
    return 0;
  }
}

export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}
