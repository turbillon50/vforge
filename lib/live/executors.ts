export const FACTORY_EXECUTORS = ["grok", "cursor", "claude", "codex"] as const;
export type FactoryExecutor = (typeof FACTORY_EXECUTORS)[number];

export const EXECUTOR_LABEL: Record<FactoryExecutor, string> = {
  grok: "Grok",
  cursor: "Cursor",
  claude: "Claude Code",
  codex: "Codex",
};

export function parseRequestedExecutors(raw: unknown): FactoryExecutor[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[+|,\s]+/)
      : [];
  const picked: FactoryExecutor[] = [];
  for (const value of values) {
    const key = String(value).trim().toLowerCase();
    if (key === "auto") continue;
    const mapped =
      key === "claude-code" || key === "claudecode" ? "claude" : key;
    if (!FACTORY_EXECUTORS.includes(mapped as FactoryExecutor)) continue;
    if (!picked.includes(mapped as FactoryExecutor)) picked.push(mapped as FactoryExecutor);
    if (picked.length === 2) break;
  }
  return picked.length ? picked : ["grok"];
}
