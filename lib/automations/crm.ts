/**
 * CRM real — helpers de contactos, interacciones y pipeline.
 *
 * Cada WhatsApp entrante crea/actualiza un contacto y registra la interacción
 * automáticamente (ver upsertContactFromWa). El pipeline lee crm_leads/crm_stages.
 */
import { randomUUID } from "crypto";
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "./schema";
import type { CrmContact } from "./types";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export interface UpsertContactInput {
  waNumber?: string | null;
  name?: string | null;
  pushName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string;
  tags?: string[];
}

/**
 * Upsert por wa_number (clave natural del canal WhatsApp). Devuelve el contacto
 * y si fue creado nuevo. Refresca push_name/last_seen en cada toque.
 */
export async function upsertContactFromWa(
  input: UpsertContactInput,
): Promise<{ contact: CrmContact; created: boolean }> {
  await ensureAutomationsSchema();
  const wa = (input.waNumber ?? "").replace(/[^\d]/g, "");

  if (wa) {
    const existing = (await sql`
      SELECT * FROM crm_contacts WHERE wa_number = ${wa} LIMIT 1
    `) as unknown as CrmContact[];
    if (existing.length > 0) {
      const c = existing[0];
      const updated = (await sql`
        UPDATE crm_contacts
           SET push_name = COALESCE(${input.pushName ?? null}, push_name),
               name      = COALESCE(name, ${input.name ?? null}),
               last_seen = now()
         WHERE id = ${c.id}
        RETURNING *
      `) as unknown as CrmContact[];
      return { contact: updated[0], created: false };
    }
  }

  const id = newId("c");
  const created = (await sql`
    INSERT INTO crm_contacts (id, wa_number, name, push_name, email, phone, source, tags)
    VALUES (
      ${id},
      ${wa || null},
      ${input.name ?? null},
      ${input.pushName ?? null},
      ${input.email ?? null},
      ${input.phone ?? null},
      ${input.source ?? "whatsapp"},
      ${input.tags ?? []}
    )
    ON CONFLICT (wa_number) DO UPDATE
      SET push_name = COALESCE(EXCLUDED.push_name, crm_contacts.push_name),
          last_seen = now()
    RETURNING *
  `) as unknown as CrmContact[];
  return { contact: created[0], created: true };
}

export interface InteractionInput {
  contactId: string;
  leadId?: string | null;
  direction: "in" | "out";
  channel?: string;
  body: string;
  flowRunId?: string | null;
  meta?: Record<string, unknown>;
}

export async function logInteraction(i: InteractionInput): Promise<string> {
  await ensureAutomationsSchema();
  const id = newId("i");
  await sql`
    INSERT INTO crm_interactions (id, contact_id, lead_id, direction, channel, body, flow_run_id, meta)
    VALUES (
      ${id}, ${i.contactId}, ${i.leadId ?? null}, ${i.direction},
      ${i.channel ?? "whatsapp"}, ${i.body}, ${i.flowRunId ?? null},
      ${JSON.stringify(i.meta ?? {})}::jsonb
    )
  `;
  return id;
}

/**
 * Asegura un lead "abierto" para el contacto en la etapa indicada (por defecto
 * Nuevo). No duplica: si ya hay un lead abierto, lo devuelve.
 */
export async function ensureOpenLead(
  contactId: string,
  opts: { stageId?: string; title?: string; owner?: string } = {},
): Promise<string> {
  await ensureAutomationsSchema();
  const open = (await sql`
    SELECT id FROM crm_leads WHERE contact_id = ${contactId} AND status = 'open' LIMIT 1
  `) as unknown as { id: string }[];
  if (open.length > 0) return open[0].id;

  const id = newId("l");
  await sql`
    INSERT INTO crm_leads (id, contact_id, title, stage_id, owner)
    VALUES (${id}, ${contactId}, ${opts.title ?? "Lead WhatsApp"}, ${opts.stageId ?? "stage_nuevo"}, ${opts.owner ?? null})
  `;
  return id;
}

export async function listStages() {
  await ensureAutomationsSchema();
  return (await sql`SELECT * FROM crm_stages ORDER BY position ASC`) as unknown as Array<{
    id: string;
    name: string;
    position: number;
    color: string;
    is_won: boolean;
    is_lost: boolean;
  }>;
}
