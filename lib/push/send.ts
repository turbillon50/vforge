import webpush from "web-push";
import { neon } from "@neondatabase/serverless";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys no configuradas");
  webpush.setVapidDetails("mailto:luisdelator@vmomentums.info", pub, priv);
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
      created_at timestamptz DEFAULT now()
    )
  `;
}

export interface PushPayload { title: string; body: string; url?: string; }

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  configure();
  await ensurePushTable();
  const subs = (await sql()`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE clerk_user_id = ${userId}
  `) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
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
