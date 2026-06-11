/**
 * CRUD de flujos: persiste el documento del editor (graph) y SINCRONIZA los
 * nodos normalizados (flow_nodes) + triggers, que son lo que ejecuta el motor.
 */
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "./schema";
import { runFlow } from "./engine";
import { newId } from "./crm";
import type { Flow, FlowNode, FlowTrigger, NodeType, TriggerType } from "./types";

export interface EditorNode {
  key: string;
  type: NodeType;
  label?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
  next?: string[];
  next_alt?: string[];
}

export interface EditorTrigger {
  type: TriggerType;
  config?: Record<string, unknown>;
  active?: boolean;
}

export interface SaveFlowInput {
  id?: string;
  name: string;
  description?: string;
  status?: "draft" | "active" | "paused";
  nodes: EditorNode[];
  edges?: unknown[];
  triggers?: EditorTrigger[];
  createdBy?: string | null;
}

export async function listFlows(): Promise<Array<Flow & { runs: number; triggers: number }>> {
  await ensureAutomationsSchema();
  return (await sql`
    SELECT f.*,
           (SELECT count(*) FROM flow_runs r WHERE r.flow_id = f.id)::int AS runs,
           (SELECT count(*) FROM flow_triggers t WHERE t.flow_id = f.id)::int AS triggers
      FROM flows f
     ORDER BY f.updated_at DESC
  `) as unknown as Array<Flow & { runs: number; triggers: number }>;
}

export async function getFlow(id: string) {
  await ensureAutomationsSchema();
  const flows = (await sql`SELECT * FROM flows WHERE id = ${id} LIMIT 1`) as unknown as Flow[];
  if (flows.length === 0) return null;
  const nodes = (await sql`SELECT * FROM flow_nodes WHERE flow_id = ${id}`) as unknown as FlowNode[];
  const triggers = (await sql`SELECT * FROM flow_triggers WHERE flow_id = ${id}`) as unknown as FlowTrigger[];
  return { flow: flows[0], nodes, triggers };
}

export async function saveFlow(input: SaveFlowInput): Promise<string> {
  await ensureAutomationsSchema();
  const id = input.id ?? newId("flow");
  const graph = { nodes: input.nodes, edges: input.edges ?? [] };

  await sql`
    INSERT INTO flows (id, name, description, status, graph, created_by)
    VALUES (${id}, ${input.name}, ${input.description ?? ""}, ${input.status ?? "draft"},
            ${JSON.stringify(graph)}::jsonb, ${input.createdBy ?? null})
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          graph = EXCLUDED.graph,
          updated_at = now()
  `;

  // Re-sincroniza nodos (reemplazo completo: el editor es la fuente de verdad).
  await sql`DELETE FROM flow_nodes WHERE flow_id = ${id}`;
  for (const n of input.nodes) {
    await sql`
      INSERT INTO flow_nodes (id, flow_id, node_key, type, label, config, position, next, next_alt)
      VALUES (
        ${`${id}:${n.key}`}, ${id}, ${n.key}, ${n.type}, ${n.label ?? n.type},
        ${JSON.stringify(n.config ?? {})}::jsonb,
        ${JSON.stringify(n.position ?? { x: 0, y: 0 })}::jsonb,
        ${n.next ?? []}, ${n.next_alt ?? []}
      )
    `;
  }

  // Re-sincroniza triggers.
  if (input.triggers) {
    await sql`DELETE FROM flow_triggers WHERE flow_id = ${id}`;
    for (const t of input.triggers) {
      await sql`
        INSERT INTO flow_triggers (id, flow_id, type, config, active)
        VALUES (${newId("trg")}, ${id}, ${t.type}, ${JSON.stringify(t.config ?? {})}::jsonb, ${t.active ?? true})
      `;
    }
  }

  return id;
}

export async function setFlowStatus(id: string, status: "draft" | "active" | "paused"): Promise<void> {
  await ensureAutomationsSchema();
  await sql`UPDATE flows SET status = ${status}, updated_at = now() WHERE id = ${id}`;
}

export async function deleteFlow(id: string): Promise<void> {
  await ensureAutomationsSchema();
  await sql`DELETE FROM flows WHERE id = ${id}`;
}

/**
 * Despacha un WhatsApp entrante: corre cada flujo ACTIVO con trigger wa_incoming
 * cuyo filtro de keyword/bridge coincida. Devuelve los runIds disparados.
 */
export async function dispatchWaIncoming(payload: {
  from: string;
  body: string;
  pushName?: string;
  contactId: string;
  bridge?: string;
}): Promise<Array<{ flowId: string; runId: string; status: string }>> {
  await ensureAutomationsSchema();
  const triggers = (await sql`
    SELECT t.* FROM flow_triggers t
    JOIN flows f ON f.id = t.flow_id
    WHERE t.type = 'wa_incoming' AND t.active = true AND f.status = 'active'
  `) as unknown as FlowTrigger[];

  const body = (payload.body ?? "").toLowerCase();
  const results: Array<{ flowId: string; runId: string; status: string }> = [];

  for (const t of triggers) {
    const cfg = t.config ?? {};
    const keyword = String((cfg.keyword as string) ?? "").trim().toLowerCase();
    const matchMode = (cfg.match as string) ?? (keyword ? "contains" : "all");
    let matched = false;
    if (matchMode === "all" || !keyword) matched = true;
    else if (matchMode === "contains") matched = body.includes(keyword);
    else if (matchMode === "equals") matched = body === keyword;
    else if (matchMode === "starts") matched = body.startsWith(keyword);
    if (cfg.bridge && payload.bridge && cfg.bridge !== payload.bridge) matched = false;
    if (!matched) continue;

    const res = await runFlow(t.flow_id, {
      triggerId: t.id,
      triggerType: "wa_incoming",
      initialContext: {
        from: payload.from,
        body: payload.body,
        pushName: payload.pushName ?? "",
        contactId: payload.contactId,
        bridge: payload.bridge ?? "personal",
      },
    });
    await sql`UPDATE flow_triggers SET last_fired_at = now() WHERE id = ${t.id}`;
    results.push({ flowId: t.flow_id, runId: res.runId, status: res.status });
  }
  return results;
}
