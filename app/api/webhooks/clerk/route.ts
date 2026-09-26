import { headers } from "next/headers";
import { Webhook } from "svix";
import { upsertUserByClerkId } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET no configurado");
    return new Response("No secret", { status: 500 });
  }

  const payload = await req.text();
  const hdrs = await headers();
  const svixHeaders = {
    "svix-id":        hdrs.get("svix-id") ?? "",
    "svix-timestamp": hdrs.get("svix-timestamp") ?? "",
    "svix-signature": hdrs.get("svix-signature") ?? "",
  };

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, svixHeaders) as ClerkUserEvent;
  } catch (err) {
    console.error("[clerk-webhook] firma inválida", err);
    return new Response("Bad signature", { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const clerkId = data.id;
    const primaryEmail = data.email_addresses?.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address;
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;

    try {
      await upsertUserByClerkId(clerkId, primaryEmail, fullName, data.image_url);
      console.log(`[clerk-webhook] usuario ${type} → ${clerkId} (${primaryEmail})`);
    } catch (err) {
      console.error("[clerk-webhook] error upsert usuario:", err);
      return new Response("DB error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
