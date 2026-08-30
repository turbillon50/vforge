export type ProjectDecisionKind =
  | "talk_to_plan"
  | "plan_to_task"
  | "comment_to_task"
  | "approved"
  | "published";

export interface ProjectDecision {
  kind: ProjectDecisionKind;
  summary: string;
  sourceId?: string | null;
  createdAt?: string | null;
}

const KINDS = new Set<ProjectDecisionKind>([
  "talk_to_plan",
  "plan_to_task",
  "comment_to_task",
  "approved",
  "published",
]);

export function isProjectDecisionKind(value: unknown): value is ProjectDecisionKind {
  return typeof value === "string" && KINDS.has(value as ProjectDecisionKind);
}

export function formatDecisionLog(decisions: ProjectDecision[]): string {
  const rows = decisions
    .filter((item) => item.summary.trim())
    .slice(0, 20);
  if (!rows.length) return "DECISIONES: ninguna todavía.";
  return [
    `HISTORIAL DE DECISIONES (${rows.length}):`,
    ...rows.map((item, index) => {
      const when = item.createdAt
        ? ` · ${item.createdAt.slice(0, 16).replace("T", " ")}`
        : "";
      return `${index + 1}. [${item.kind}]${when} ${item.summary.trim().slice(0, 240)}`;
    }),
  ].join("\n");
}
