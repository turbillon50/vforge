"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  IconPlus,
  IconPlay,
  IconCheck,
  IconTrash,
  IconZap,
  IconLoader,
  IconActivity,
} from "@/components/brand/VFIcons";
import { FlowCanvas } from "@/components/automations/FlowCanvas";
import { type EditorNode, NODE_META, PALETTE } from "@/components/automations/flow-types";
import type { NodeType } from "@/lib/automations/types";

interface FlowSummary {
  id: string;
  name: string;
  status: string;
  runs: number;
  triggers: number;
  updated_at: string;
}
interface RunRow {
  id: string;
  status: string;
  trigger_type: string;
  started_at: string;
  error: string | null;
}

function uid() {
  return "n" + Math.random().toString(36).slice(2, 8);
}

function freshTrigger(): EditorNode {
  return {
    key: "trigger",
    type: "trigger",
    label: "WhatsApp entrante",
    config: { triggerType: "wa_incoming", match: "all", keyword: "", bridge: "" },
    position: { x: 60, y: 200 },
    next: [],
    next_alt: [],
  };
}

export default function BlueprintPage() {
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [name, setName] = useState("Nuevo flujo");
  const [status, setStatus] = useState("draft");
  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<"main" | "alt">("main");
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [logOutput, setLogOutput] = useState<string[] | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/automatizaciones/flows", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setFlows(d.flows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const newFlow = () => {
    setFlowId(null);
    setName("Nuevo flujo");
    setStatus("draft");
    setNodes([freshTrigger()]);
    setSelected("trigger");
    setRuns([]);
    setLogOutput(null);
  };

  const openFlow = async (id: string) => {
    const r = await fetch(`/api/automatizaciones/flows/${id}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!d.flow) return;
    setFlowId(d.flow.id);
    setName(d.flow.name);
    setStatus(d.flow.status);
    setNodes(
      (d.nodes ?? []).map((n: Record<string, unknown>) => ({
        key: n.node_key as string,
        type: n.type as NodeType,
        label: (n.label as string) || (n.type as string),
        config: (n.config as Record<string, unknown>) ?? {},
        position: (n.position as { x: number; y: number }) ?? { x: 60, y: 60 },
        next: (n.next as string[]) ?? [],
        next_alt: (n.next_alt as string[]) ?? [],
      })),
    );
    setRuns(d.runs ?? []);
    setSelected(null);
    setLogOutput(null);
  };

  const addNode = (type: NodeType) => {
    const key = uid();
    const defaults: Record<string, unknown> =
      type === "wa_send"
        ? { bridge: "goossip", to: "{{from}}", message: "¡Hola {{pushName}}! Gracias por tu mensaje 👋" }
        : type === "condition"
          ? { left: "{{body}}", op: "contains", right: "" }
          : type === "delay"
            ? { seconds: 2 }
            : type === "http"
              ? { method: "POST", url: "", body: {} }
              : type === "crm_upsert"
                ? { createLead: true, stageId: "stage_nuevo" }
                : { message: "{{body}}" };
    setNodes((prev) => [
      ...prev,
      {
        key,
        type,
        label: NODE_META[type].name,
        config: defaults,
        position: { x: 280 + prev.length * 30, y: 120 + prev.length * 24 },
        next: [],
        next_alt: [],
      },
    ]);
    setSelected(key);
  };

  const move = (key: string, pos: { x: number; y: number }) =>
    setNodes((prev) => prev.map((n) => (n.key === key ? { ...n, position: pos } : n)));

  const completeLink = (target: string) => {
    if (!linkFrom) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.key !== linkFrom) return n;
        const field = linkMode === "alt" ? "next_alt" : "next";
        const arr = n[field];
        return arr.includes(target) ? n : { ...n, [field]: [...arr, target] };
      }),
    );
    setLinkFrom(null);
    setLinkMode("main");
  };

  const patchNode = (key: string, patch: Partial<EditorNode>) =>
    setNodes((prev) => prev.map((n) => (n.key === key ? { ...n, ...patch } : n)));
  const patchConfig = (key: string, patch: Record<string, unknown>) =>
    setNodes((prev) => prev.map((n) => (n.key === key ? { ...n, config: { ...n.config, ...patch } } : n)));
  const removeNode = (key: string) => {
    if (key === "trigger") return;
    setNodes((prev) =>
      prev
        .filter((n) => n.key !== key)
        .map((n) => ({ ...n, next: n.next.filter((k) => k !== key), next_alt: n.next_alt.filter((k) => k !== key) })),
    );
    setSelected(null);
  };

  const triggersFromNodes = () => {
    const t = nodes.find((n) => n.type === "trigger");
    if (!t) return [];
    const tt = (t.config.triggerType as string) ?? "wa_incoming";
    if (tt === "wa_incoming")
      return [{ type: "wa_incoming" as const, config: { match: t.config.match, keyword: t.config.keyword, bridge: t.config.bridge || undefined } }];
    if (tt === "cron")
      return [{ type: "cron" as const, config: { everyMinutes: Number(t.config.everyMinutes ?? 60) } }];
    if (tt === "webhook") return [{ type: "webhook" as const, config: {} }];
    return [];
  };

  const save = async (): Promise<string | null> => {
    setSaving(true);
    const r = await fetch("/api/automatizaciones/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: flowId ?? undefined, name, status, nodes, triggers: triggersFromNodes() }),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (d.id) {
      setFlowId(d.id);
      await loadList();
      return d.id as string;
    }
    return flowId;
  };

  const toggleActive = async () => {
    if (!flowId) return;
    const next = status === "active" ? "paused" : "active";
    await fetch(`/api/automatizaciones/flows/${flowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatus(next);
    await loadList();
  };

  const run = async () => {
    // Garantiza tener un id real: si el flujo es nuevo, save() lo crea y lo
    // devuelve (el estado flowId aún sería null en este closure).
    const id = flowId ?? (await save());
    if (!id) {
      setLogOutput(["[error] engine: no se pudo guardar el flujo antes de probar"]);
      return;
    }
    setRunning(true);
    setLogOutput(null);
    const r = await fetch(`/api/automatizaciones/flows/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: { from: "5219984292748", body: "hola", pushName: "Prueba" } }),
    });
    const d = await r.json().catch(() => ({}));
    setLogOutput(
      (d.logs ?? []).map((l: { level: string; nodeKey: string; message: string }) => `[${l.level}] ${l.nodeKey}: ${l.message}`),
    );
    setRunning(false);
    await openFlow(id);
  };

  const sel = nodes.find((n) => n.key === selected) ?? null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Blueprint"
        description="Diseña cómo trabaja la empresa · nodos, automatizaciones, CRM · WhatsApp"
      />

      <div className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[220px_1fr_300px]">
        {/* Columna izquierda: lista + paleta */}
        <div className="flex flex-col gap-3">
          <button
            onClick={newFlow}
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/20"
          >
            <IconPlus size={16} /> Nuevo flujo
          </button>

          <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-2">
            <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">Mis flujos</p>
            {loading ? (
              <div className="flex justify-center py-4 text-[var(--fg-tertiary)]"><IconLoader size={18} /></div>
            ) : flows.length === 0 ? (
              <p className="px-1 py-3 text-xs text-[var(--fg-muted)]">Aún no hay flujos. Crea el primero.</p>
            ) : (
              <ul className="space-y-1">
                {flows.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => openFlow(f.id)}
                      className={
                        "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs " +
                        (flowId === f.id ? "bg-violet-500/15 text-white" : "text-[var(--fg-secondary)] hover:bg-[var(--surface-1)]")
                      }
                    >
                      <span className="truncate">{f.name}</span>
                      <span
                        className={
                          "ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase " +
                          (f.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-[var(--surface-1)] text-[var(--fg-tertiary)]")
                        }
                      >
                        {f.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(nodes.length > 0 || flowId) && (
            <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-2">
              <p className="px-1 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">Agregar nodo</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PALETTE.map((t) => (
                  <button
                    key={t}
                    onClick={() => addNode(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border-1)] px-2 py-1.5 text-[11px] text-[var(--fg-primary)] hover:border-[var(--border-2)]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_META[t].color }} />
                    {NODE_META[t].name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Centro: lienzo */}
        <div className="flex flex-col gap-2">
          {(nodes.length > 0 || flowId) && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/50"
              />
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-primary)] hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                {saving ? <IconLoader size={14} /> : <IconCheck size={14} />} Guardar
              </button>
              <button
                onClick={run}
                disabled={running}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
              >
                {running ? <IconLoader size={14} /> : <IconPlay size={14} />} Probar
              </button>
              {flowId && (
                <button
                  onClick={toggleActive}
                  className={
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold " +
                    (status === "active"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                      : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-secondary)] hover:bg-[var(--surface-2)]")
                  }
                >
                  <IconZap size={14} /> {status === "active" ? "Activo" : "Activar"}
                </button>
              )}
            </div>
          )}

          {nodes.length === 0 && !flowId ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-1)] py-20 text-center">
              <span className="mb-3 text-violet-400"><IconZap size={34} /></span>
              <p className="text-sm text-[var(--fg-secondary)]">Selecciona un flujo o crea uno nuevo.</p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">Conecta nodos esféricos para automatizar WhatsApp + CRM.</p>
            </div>
          ) : (
            <FlowCanvas
              nodes={nodes}
              selected={selected}
              linkFrom={linkFrom}
              onSelect={setSelected}
              onMove={move}
              onStartLink={(k) => {
                setLinkMode("main");
                setLinkFrom(k);
              }}
              onCompleteLink={completeLink}
            />
          )}

          {linkFrom && (
            <p className="text-center text-[11px] text-violet-300">
              Conectando ({linkMode === "alt" ? "rama falso" : "rama principal"})… haz clic en el nodo destino.{" "}
              <button onClick={() => setLinkFrom(null)} className="underline">cancelar</button>
            </p>
          )}

          {logOutput && (
            <div className="rounded-xl border border-[var(--border-1)] bg-black/40 p-3 font-mono text-[11px] text-[var(--fg-secondary)]">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">Resultado de la corrida</p>
              {logOutput.length === 0 ? <p>sin logs</p> : logOutput.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        {/* Derecha: inspector + corridas */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3">
            <p className="pb-2 text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">Inspector</p>
            <AnimatePresence mode="wait">
              {!sel ? (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-[var(--fg-muted)]">
                  Selecciona un nodo para configurarlo.
                </motion.p>
              ) : (
                <motion.div key={sel.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <Field label="Etiqueta">
                    <input value={sel.label} onChange={(e) => patchNode(sel.key, { label: e.target.value })} className={inputCls} />
                  </Field>

                  {sel.type === "trigger" && <TriggerFields node={sel} patch={(p) => patchConfig(sel.key, p)} />}
                  {sel.type === "wa_send" && <WaSendFields node={sel} patch={(p) => patchConfig(sel.key, p)} />}
                  {sel.type === "condition" && <ConditionFields node={sel} patch={(p) => patchConfig(sel.key, p)} onLinkAlt={() => { setLinkMode("alt"); setLinkFrom(sel.key); }} />}
                  {sel.type === "delay" && (
                    <Field label="Segundos (máx 8)">
                      <input type="number" value={Number(sel.config.seconds ?? 0)} onChange={(e) => patchConfig(sel.key, { seconds: Number(e.target.value) })} className={inputCls} />
                    </Field>
                  )}
                  {sel.type === "crm_upsert" && (
                    <label className="flex items-center gap-2 text-xs text-[var(--fg-secondary)]">
                      <input type="checkbox" checked={Boolean(sel.config.createLead)} onChange={(e) => patchConfig(sel.key, { createLead: e.target.checked })} />
                      Crear lead en pipeline
                    </label>
                  )}
                  {sel.type === "http" && (
                    <>
                      <Field label="URL"><input value={String(sel.config.url ?? "")} onChange={(e) => patchConfig(sel.key, { url: e.target.value })} className={inputCls} /></Field>
                      <Field label="Método"><input value={String(sel.config.method ?? "POST")} onChange={(e) => patchConfig(sel.key, { method: e.target.value })} className={inputCls} /></Field>
                    </>
                  )}
                  {sel.type === "log" && (
                    <Field label="Mensaje"><input value={String(sel.config.message ?? "")} onChange={(e) => patchConfig(sel.key, { message: e.target.value })} className={inputCls} /></Field>
                  )}

                  {sel.key !== "trigger" && (
                    <button onClick={() => removeNode(sel.key)} className="flex items-center gap-1.5 text-xs text-red-400/80 hover:text-red-300">
                      <IconTrash size={13} /> Eliminar nodo
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {runs.length > 0 && (
            <div className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3">
              <p className="pb-2 text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">Últimas corridas</p>
              <ul className="space-y-1.5">
                {runs.slice(0, 10).map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-[var(--fg-secondary)]">
                      <IconActivity size={12} /> {r.trigger_type}
                    </span>
                    <span className={r.status === "success" ? "text-emerald-300" : r.status === "error" ? "text-red-400" : "text-[var(--fg-tertiary)]"}>
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-400/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">{label}</span>
      {children}
    </label>
  );
}

function TriggerFields({ node, patch }: { node: EditorNode; patch: (p: Record<string, unknown>) => void }) {
  const tt = (node.config.triggerType as string) ?? "wa_incoming";
  return (
    <>
      <Field label="Tipo de disparador">
        <select value={tt} onChange={(e) => patch({ triggerType: e.target.value })} className={inputCls}>
          <option value="wa_incoming">WhatsApp entrante</option>
          <option value="cron">Programado (cron)</option>
          <option value="webhook">Webhook</option>
        </select>
      </Field>
      {tt === "wa_incoming" && (
        <>
          <Field label="Coincidencia">
            <select value={String(node.config.match ?? "all")} onChange={(e) => patch({ match: e.target.value })} className={inputCls}>
              <option value="all">Cualquier mensaje</option>
              <option value="contains">Contiene…</option>
              <option value="equals">Igual a…</option>
              <option value="starts">Empieza con…</option>
            </select>
          </Field>
          {node.config.match !== "all" && (
            <Field label="Palabra clave"><input value={String(node.config.keyword ?? "")} onChange={(e) => patch({ keyword: e.target.value })} className={inputCls} /></Field>
          )}
          <Field label="Remitente (filtro, opcional)">
            <select value={String(node.config.bridge ?? "")} onChange={(e) => patch({ bridge: e.target.value })} className={inputCls}>
              <option value="">Cualquiera</option>
              <option value="personal">Personal</option>
              <option value="goossip">Goossip</option>
            </select>
          </Field>
        </>
      )}
      {tt === "cron" && (
        <Field label="Cada N minutos"><input type="number" value={Number(node.config.everyMinutes ?? 60)} onChange={(e) => patch({ everyMinutes: Number(e.target.value) })} className={inputCls} /></Field>
      )}
    </>
  );
}

function WaSendFields({ node, patch }: { node: EditorNode; patch: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Remitente">
        <select value={String(node.config.bridge ?? "goossip")} onChange={(e) => patch({ bridge: e.target.value })} className={inputCls}>
          <option value="personal">Personal (Luis)</option>
          <option value="goossip">Goossip</option>
        </select>
      </Field>
      <Field label="Para (número o {{from}})"><input value={String(node.config.to ?? "{{from}}")} onChange={(e) => patch({ to: e.target.value })} className={inputCls} /></Field>
      <Field label="Mensaje">
        <textarea value={String(node.config.message ?? "")} onChange={(e) => patch({ message: e.target.value })} rows={3} className={inputCls} />
      </Field>
      <p className="text-[10px] text-[var(--fg-muted)]">Variables: {"{{from}}"}, {"{{body}}"}, {"{{pushName}}"}</p>
    </>
  );
}

function ConditionFields({
  node,
  patch,
  onLinkAlt,
}: {
  node: EditorNode;
  patch: (p: Record<string, unknown>) => void;
  onLinkAlt: () => void;
}) {
  return (
    <>
      <Field label="Valor (izquierda)"><input value={String(node.config.left ?? "{{body}}")} onChange={(e) => patch({ left: e.target.value })} className={inputCls} /></Field>
      <Field label="Operador">
        <select value={String(node.config.op ?? "contains")} onChange={(e) => patch({ op: e.target.value })} className={inputCls}>
          <option value="contains">contiene</option>
          <option value="not_contains">no contiene</option>
          <option value="eq">igual a</option>
          <option value="neq">distinto de</option>
          <option value="starts">empieza con</option>
          <option value="empty">está vacío</option>
          <option value="not_empty">no vacío</option>
        </select>
      </Field>
      <Field label="Valor (derecha)"><input value={String(node.config.right ?? "")} onChange={(e) => patch({ right: e.target.value })} className={inputCls} /></Field>
      <button onClick={onLinkAlt} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20">
        Conectar rama «falso» →
      </button>
    </>
  );
}
