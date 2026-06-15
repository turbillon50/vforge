/**
 * Ejecutor de flujos (tipo n8n).
 *
 * - Carga los nodos normalizados (flow_nodes) de un flujo.
 * - Arranca en el nodo `trigger` y recorre `next` (o `next_alt` en condition).
 * - Mantiene estado por corrida (flow_runs) con contexto + logs persistidos.
 * - Cada handler de nodo devuelve { vars?, branch? } y agrega un log.
 *
 * Corre dentro de un request (Node runtime). `delay` se acota para no exceder
 * el tiempo de una función serverless; delays largos los maneja el scheduler.
 */
import { randomUUID } from "crypto";
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "./schema";
import { sendWhatsApp } from "./whatsapp";
import { upsertContactFromWa, logInteraction, ensureOpenLead } from "./crm";
import type { BridgeId, FlowNode, NodeType, RunLogEntry } from "./types";

const MAX_STEPS = 100; // corta ciclos
const MAX_DELAY_MS = 8000; // tope en-request

function uid(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** Render mustache simple: {{a.b}} contra el contexto. */
export function render(tpl: unknown, ctx: Record<string, unknown>): string {
  if (typeof tpl !== "string") return "";
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const val = path.split(".").reduce<unknown>((acc, k) => {
      if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, ctx);
    return val === undefined || val === null ? "" : String(val);
  });
}

function evalCondition(
  left: unknown,
  op: string,
  right: unknown,
  ctx: Record<string, unknown>,
): boolean {
  const l = render(typeof left === "string" ? left : String(left ?? ""), ctx).toLowerCase();
  const r = render(typeof right === "string" ? right : String(right ?? ""), ctx).toLowerCase();
  switch (op) {
    case "eq":
      return l === r;
    case "neq":
      return l !== r;
    case "contains":
      return l.includes(r);
    case "not_contains":
      return !l.includes(r);
    case "starts":
      return l.startsWith(r);
    case "empty":
      return l.trim() === "";
    case "not_empty":
      return l.trim() !== "";
    default:
      return false;
  }
}

interface NodeResult {
  vars?: Record<string, unknown>;
  branch?: "main" | "alt";
}

interface RunContext {
  runId: string;
  ctx: Record<string, unknown>;
  logs: RunLogEntry[];
}

function log(rc: RunContext, nodeKey: string, level: RunLogEntry["level"], message: string, data?: unknown) {
  rc.logs.push({ ts: new Date().toISOString(), nodeKey, level, message, data });
}

async function runNode(node: FlowNode, rc: RunContext): Promise<NodeResult> {
  const cfg = node.config ?? {};
  switch (node.type as NodeType) {
    case "trigger": {
      log(rc, node.node_key, "info", "Disparador", { trigger: cfg.trigger ?? "manual" });
      return {};
    }

    case "log": {
      const msg = render((cfg.message as string) ?? "", rc.ctx);
      log(rc, node.node_key, "info", msg || "log");
      return {};
    }

    case "wa_send": {
      const bridge = ((cfg.bridge as string) ?? "personal") as BridgeId;
      const to = render((cfg.to as string) ?? "{{from}}", rc.ctx);
      const message = render((cfg.message as string) ?? "", rc.ctx);
      const res = await sendWhatsApp(bridge, to, message);
      if (res.ok) {
        log(rc, node.node_key, "info", `WhatsApp enviado por ${bridge} → ${res.to}`, { id: res.id });
        // Registrar la salida como interacción si conocemos el contacto.
        const contactId = rc.ctx.contactId as string | undefined;
        if (contactId) {
          await logInteraction({
            contactId,
            direction: "out",
            channel: "whatsapp",
            body: message,
            flowRunId: rc.runId,
            meta: { bridge, waId: res.id },
          });
        }
        return { vars: { lastSend: res.id } };
      }
      log(rc, node.node_key, "error", `Falló envío WhatsApp: ${res.error}`, res);
      throw new Error(`wa_send: ${res.error}`);
    }

    case "crm_upsert": {
      const from = render((cfg.waNumber as string) ?? "{{from}}", rc.ctx);
      const { contact, created } = await upsertContactFromWa({
        waNumber: from,
        pushName: (rc.ctx.pushName as string) ?? null,
        source: (cfg.source as string) ?? "whatsapp",
      });
      if (cfg.createLead) {
        await ensureOpenLead(contact.id, { stageId: (cfg.stageId as string) ?? "stage_nuevo" });
      }
      log(rc, node.node_key, "info", created ? "Contacto CRM creado" : "Contacto CRM actualizado", {
        contactId: contact.id,
      });
      return { vars: { contactId: contact.id, contactCreated: created } };
    }

    case "condition": {
      const ok = evalCondition(cfg.left, (cfg.op as string) ?? "contains", cfg.right, rc.ctx);
      log(rc, node.node_key, "info", `Condición → ${ok ? "verdadero" : "falso"}`);
      return { branch: ok ? "main" : "alt" };
    }

    case "delay": {
      const ms = Math.min(MAX_DELAY_MS, Math.max(0, Number(cfg.seconds ?? 0) * 1000));
      if (ms > 0) await new Promise((r) => setTimeout(r, ms));
      log(rc, node.node_key, "info", `Espera ${ms} ms`);
      return {};
    }

    case "http": {
      const url = render((cfg.url as string) ?? "", rc.ctx);
      const method = ((cfg.method as string) ?? "POST").toUpperCase();
      const body = cfg.body ? render(JSON.stringify(cfg.body), rc.ctx) : undefined;
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...(cfg.headers as Record<string, string>) },
          body: method === "GET" ? undefined : body,
          signal: AbortSignal.timeout(12000),
        });
        const text = await res.text();
        log(rc, node.node_key, res.ok ? "info" : "warn", `HTTP ${method} ${res.status}`, {
          preview: text.slice(0, 200),
        });
        return { vars: { lastHttpStatus: res.status } };
      } catch (e) {
        log(rc, node.node_key, "error", `HTTP falló: ${e instanceof Error ? e.message : e}`);
        throw e;
      }
    }

    default:
      log(rc, node.node_key, "warn", `Tipo de nodo desconocido: ${node.type}`);
      return {};
  }
}

async function persistRun(rc: RunContext, status: string, error: string | null, finished: boolean) {
  await sql`
    UPDATE flow_runs
       SET status = ${status},
           context = ${JSON.stringify(rc.ctx)}::jsonb,
           logs = ${JSON.stringify(rc.logs)}::jsonb,
           error = ${error},
           finished_at = ${finished ? new Date().toISOString() : null}
     WHERE id = ${rc.runId}
  `;
}

export interface RunFlowOptions {
  triggerId?: string | null;
  triggerType?: string;
  initialContext?: Record<string, unknown>;
}

export interface RunFlowResult {
  runId: string;
  status: "success" | "error";
  logs: RunLogEntry[];
  context: Record<string, unknown>;
  error?: string;
}

/** Ejecuta un flujo completo y persiste la corrida con su estado y logs. */
export async function runFlow(flowId: string, opts: RunFlowOptions = {}): Promise<RunFlowResult> {
  await ensureAutomationsSchema();

  const nodes = (await sql`
    SELECT * FROM flow_nodes WHERE flow_id = ${flowId}
  `) as unknown as FlowNode[];

  if (nodes.length === 0) {
    throw new Error("flujo sin nodos");
  }

  const byKey = new Map(nodes.map((n) => [n.node_key, n]));
  const start =
    nodes.find((n) => n.type === "trigger") ??
    nodes.find((n) => !nodes.some((m) => m.next.includes(n.node_key) || m.next_alt.includes(n.node_key)));
  if (!start) throw new Error("flujo sin nodo de arranque");

  const runId = uid("run");
  await sql`
    INSERT INTO flow_runs (id, flow_id, trigger_id, status, trigger_type, context, logs)
    VALUES (${runId}, ${flowId}, ${opts.triggerId ?? null}, 'running', ${opts.triggerType ?? "manual"},
            ${JSON.stringify(opts.initialContext ?? {})}::jsonb, '[]'::jsonb)
  `;

  const rc: RunContext = {
    runId,
    ctx: { ...(opts.initialContext ?? {}) },
    logs: [],
  };

  let current: FlowNode | undefined = start;
  let steps = 0;
  try {
    while (current && steps < MAX_STEPS) {
      steps++;
      const result = await runNode(current, rc);
      if (result.vars) Object.assign(rc.ctx, result.vars);
      const nextKeys: string[] = result.branch === "alt" ? (current.next_alt ?? []) : (current.next ?? []);
      const nextKey: string | undefined = nextKeys[0];
      current = nextKey ? byKey.get(nextKey) : undefined;
    }
    if (steps >= MAX_STEPS) log(rc, "engine", "warn", "Límite de pasos alcanzado");
    await persistRun(rc, "success", null, true);
    return { runId, status: "success", logs: rc.logs, context: rc.ctx };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await persistRun(rc, "error", msg, true);
    return { runId, status: "error", logs: rc.logs, context: rc.ctx, error: msg };
  }
}
