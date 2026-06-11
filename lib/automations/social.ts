/**
 * Agendador social: tabla scheduled_posts + tick del scheduler.
 *
 * Política honesta de publicación:
 *  - whatsapp → publica de verdad por el puente Baileys (a un número/grupo).
 *  - plataformas con API y credenciales configuradas → publican por API.
 *  - donde NO hay API (X/LinkedIn/IG sin token) → queda como `needs_assist`
 *    con un GANCHO para el Navegador Vulcano (asistencia por navegador real).
 *    Nada de "publicado" falso.
 */
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "./schema";
import { sendWhatsApp } from "./whatsapp";
import type { BridgeId } from "./types";

export interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  media_url: string | null;
  scheduled_at: string;
  status: string;
  mode: string;
  result: Record<string, unknown>;
  error: string | null;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

/** ¿Tenemos un publicador por API real para esta plataforma? */
function hasApiPublisher(platform: string): boolean {
  switch (platform) {
    case "whatsapp":
      return true; // puente Baileys
    default:
      return false; // X/LinkedIn/IG: sin token de posteo → asistido por Vulcano
  }
}

async function publishWhatsApp(post: ScheduledPost): Promise<{ ok: boolean; detail: unknown; error?: string }> {
  const target = (post.result?.target as string) ?? (post.result?.to as string) ?? "";
  const bridge = ((post.result?.bridge as string) ?? "goossip") as BridgeId;
  if (!target) {
    return { ok: false, detail: null, error: "falta result.target (número/grupo destino)" };
  }
  const res = await sendWhatsApp(bridge, target, post.content);
  return { ok: res.ok, detail: res, error: res.error };
}

/** Construye el gancho para el Navegador Vulcano (publicación asistida real). */
function vulcanoHook(post: ScheduledPost) {
  const urls: Record<string, string> = {
    x: "https://x.com/compose/post",
    linkedin: "https://www.linkedin.com/feed/?shareActive=true",
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
  };
  return {
    assist: "vulcano-navegador",
    open_url: urls[post.platform] ?? "",
    instruction: `Publicar en ${post.platform}: "${post.content}"`,
    content: post.content,
    media_url: post.media_url,
  };
}

/** Publica un post puntual. No lanza; deja el estado/erro en la fila. */
export async function publishPost(post: ScheduledPost): Promise<ScheduledPost> {
  await ensureAutomationsSchema();
  await sql`UPDATE scheduled_posts SET status = 'publishing' WHERE id = ${post.id}`;

  if (hasApiPublisher(post.platform)) {
    let out: { ok: boolean; detail: unknown; error?: string };
    if (post.platform === "whatsapp") out = await publishWhatsApp(post);
    else out = { ok: false, detail: null, error: "publicador API no implementado" };

    if (out.ok) {
      const rows = (await sql`
        UPDATE scheduled_posts
           SET status = 'published', published_at = now(),
               result = result || ${JSON.stringify({ api: out.detail })}::jsonb
         WHERE id = ${post.id}
        RETURNING *
      `) as unknown as ScheduledPost[];
      return rows[0];
    }
    const rows = (await sql`
      UPDATE scheduled_posts SET status = 'failed', error = ${out.error ?? "error"} WHERE id = ${post.id}
      RETURNING *
    `) as unknown as ScheduledPost[];
    return rows[0];
  }

  // Sin API → gancho para Vulcano. Estado honesto: needs_assist.
  const hook = vulcanoHook(post);
  const rows = (await sql`
    UPDATE scheduled_posts
       SET status = 'needs_assist', mode = 'vulcano',
           result = result || ${JSON.stringify({ vulcano_hook: hook })}::jsonb
     WHERE id = ${post.id}
    RETURNING *
  `) as unknown as ScheduledPost[];
  return rows[0];
}

export interface TickResult {
  processed: number;
  published: number;
  needsAssist: number;
  failed: number;
  posts: Array<{ id: string; platform: string; status: string }>;
}

/** Procesa todos los posts vencidos (scheduled_at <= now). Lo llama el cron. */
export async function tickScheduler(): Promise<TickResult> {
  await ensureAutomationsSchema();
  const due = (await sql`
    SELECT * FROM scheduled_posts
     WHERE status = 'scheduled' AND scheduled_at <= now()
     ORDER BY scheduled_at ASC
     LIMIT 25
  `) as unknown as ScheduledPost[];

  const out: TickResult = { processed: 0, published: 0, needsAssist: 0, failed: 0, posts: [] };
  for (const p of due) {
    const res = await publishPost(p);
    out.processed++;
    if (res.status === "published") out.published++;
    else if (res.status === "needs_assist") out.needsAssist++;
    else if (res.status === "failed") out.failed++;
    out.posts.push({ id: res.id, platform: res.platform, status: res.status });
  }
  return out;
}
