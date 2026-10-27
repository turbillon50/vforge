import { z } from "zod";

export const moduleSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  kind: z.enum(["context", "analysis", "design", "frontend", "backend", "review", "delivery"]),
  status: z.enum(["pending", "working", "blocked", "review", "done"]),
  responsible: z.string().max(200),
  prompt: z.string().max(12000),
  result: z.string().max(12000),
  evidence: z.string().max(4000),
  dependsOn: z.array(z.string().max(80)).max(100),
  x: z.number().min(0).max(20000),
  y: z.number().min(0).max(20000),
});
export const spaceSchema = z.object({
  context: z.string().max(40000),
  modules: z.array(moduleSchema).max(100),
}).superRefine((space, ctx) => {
  const ids = new Set(space.modules.map(m => m.id));
  if (ids.size !== space.modules.length) ctx.addIssue({ code: "custom", message: "Identificadores duplicados" });
  const byId = new Map(space.modules.map(m => [m.id, m]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  function cycle(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((byId.get(id)?.dependsOn ?? []).some(cycle)) return true;
    visiting.delete(id); visited.add(id); return false;
  }
  for (const m of space.modules) {
    if (m.dependsOn.some(id => !ids.has(id) || id === m.id)) ctx.addIssue({ code: "custom", message: "Dependencia inválida" });
    if (m.status === "done" && (!m.result.trim() || !m.evidence.trim())) ctx.addIssue({ code: "custom", message: "Para completar un módulo registra resultado y evidencia" });
    if (m.status === "done" && m.dependsOn.some(id => byId.get(id)?.status !== "done")) ctx.addIssue({ code: "custom", message: "Completa primero las dependencias" });
  }
  if (space.modules.some(m => cycle(m.id))) ctx.addIssue({ code: "custom", message: "El flujo tiene un ciclo de dependencias" });
});
export type Space = z.infer<typeof spaceSchema>;
export type SpaceModule = z.infer<typeof moduleSchema>;
export const EMPTY_SPACE: Space = { context: "", modules: [] };
export const KINDS = { context: "Contexto", analysis: "Evaluación", design: "Diseño", frontend: "Frontend", backend: "Backend", review: "Pruebas", delivery: "Entrega" };
export const STATUSES = { pending: "Pendiente", working: "En trabajo", blocked: "Bloqueado", review: "En revisión", done: "Completado" };
