import { Webhook } from "svix";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Clerk → VForge user sync webhook.
 *
 * Cuando Clerk emite user.created / user.updated / user.deleted, este
 * endpoint sincroniza la fila en nuestra tabla `users` (la primary key
 * es el Clerk user id, no un uuid local).
 *
 * Config requerida (Vercel env vars):
 *   - CLERK_WEBHOOK_SECRET (de Clerk dashboard → Webhooks)
 *
 * Setup en Clerk:
 *   1. Endpoint URL: https://<tu-dominio>/api/auth/webhook
 *   2. Eventos: user.created, user.updated, user.deleted
 *   3. Copiar el Signing Secret a CLERK_WEBHOOK_SECRET en Vercel
 *
 * Sin esto, los usuarios que se registran en Clerk no aparecen en
 * nuestra DB y no pueden hacer nada que requiera user_id (proyectos,
 * vault, etc).
 */

interface ClerkUserEvent {
  type: "user.created" | "user.updated" | "user.deleted" | string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    deleted?: boolean;
  };
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return jsonError("CLERK_WEBHOOK_SECRET not configured on server", 503);
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonError("missing svix headers", 400);
  }

  const body = await req.text();

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    return jsonError(
      `webhook verification failed: ${err instanceof Error ? err.message : String(err)}`,
      401,
    );
  }

  const userId = event.data.id;
  if (!userId) return jsonError("event missing user id", 400);

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const primaryEmail =
        event.data.email_addresses?.[0]?.email_address ?? null;
      if (!primaryEmail) {
        return jsonError("user has no email address", 400);
      }
      const name =
        [event.data.first_name, event.data.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        event.data.username ||
        primaryEmail.split("@")[0];

      // UPSERT: nuevo usuario → insert con role 'client' por defecto.
      // Update → solo refresca email/name/last_seen, no toca role.
      await sql`
        INSERT INTO users (id, email, name, role, created_at, updated_at, last_seen_at)
        VALUES (${userId}, ${primaryEmail}, ${name}, 'client', now(), now(), now())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          updated_at = now()
      `;
      await sql`
        INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
        VALUES (
          ${userId},
          ${event.type === "user.created" ? "user.signup" : "user.update"},
          'user', ${userId}, 0,
          ${JSON.stringify({ email: primaryEmail, source: "clerk_webhook" })}::jsonb
        )
      `.catch(() => undefined);
    } else if (event.type === "user.deleted") {
      // Soft-delete: nullify email/name pero conservar el row para
      // mantener foreign keys de audit_events / conversations vivos.
      await sql`
        UPDATE users
           SET email = ${userId + "@deleted.local"},
               name = '[deleted]',
               updated_at = now()
         WHERE id = ${userId}
      `;
      await sql`
        INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
        VALUES (
          ${userId}, 'user.delete', 'user', ${userId}, 0,
          ${JSON.stringify({ source: "clerk_webhook" })}::jsonb
        )
      `.catch(() => undefined);
    } else {
      // Evento no manejado — devolvemos 200 para que Clerk no reintente.
      return new Response(
        JSON.stringify({ ok: true, ignored: event.type }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    return jsonError(
      `db sync failed: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  return new Response(JSON.stringify({ ok: true, synced: event.type, id: userId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
