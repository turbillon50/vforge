/**
 * Type definitions only — no mock data.
 *
 * The dashboard now reads everything from the live database via
 * /api/projects, /api/forge/conversations, etc. Empty arrays are
 * preserved as named exports for backward compatibility with
 * components that may still reference them during the transition.
 *
 * Anything that previously lived as a hardcoded array (PROJECTS,
 * VAULT_SECRETS, ACTIVITY, MODULES, RECENT_VISION, RECENT_HUNTER,
 * RECENT_SCOUT, HUB_STATS) is now empty by design — operator gives
 * each project an alta manually through the UI.
 */

export interface Project {
  id: string;
  name: string;
  slug: string;
  repo: string;
  domain: string | null;
  stack: string;
  status: "live" | "building" | "error" | "idle";
  lastDeploy: string | null;
  favicon: {
    gradient: string;
    initials: string;
    color: string;
  };
  description: string;
  secrets: number;
  deploysToday: number;
}

export interface VaultSecret {
  name: string;
  project: string | null;
  lastUsed: string | null;
  scope: "client" | "platform" | "platform-global";
  injectedTo: string[];
}

export interface Module {
  id: string;
  name: string;
  description: string;
  state: "installed" | "available" | "beta";
  tags: string[];
  icon: string;
}

export interface ActivityItem {
  id: number;
  time: string;
  actor: string;
  verb: string;
  target: string;
  kind:
    | "deploy"
    | "vault"
    | "error"
    | "vision"
    | "warning"
    | "create"
    | "scout"
    | "settings"
    | "backup"
    | "refactor";
  project: string | null;
}

export interface RecentVision {
  repo: string;
  score: string;
  duration: string;
  time: string;
}

export interface RecentHunter {
  query: string;
  results: number;
  time: string;
}

export interface RecentScout {
  question: string;
  answer: string;
  time: string;
}

// ─────────────────────────────────────────────────────────────────
// Empty exports — kept so legacy imports don't crash. Pantallas que
// dependan de estos están siendo migradas a leer de /api/* directo.
// ─────────────────────────────────────────────────────────────────

export const PROJECTS: Project[] = [];
export const VAULT_SECRETS: VaultSecret[] = [];
export const MODULES: Module[] = [];
export const ACTIVITY: ActivityItem[] = [];
export const RECENT_VISION: RecentVision[] = [];
export const RECENT_HUNTER: RecentHunter[] = [];
export const RECENT_SCOUT: RecentScout[] = [];
export const HUB_STATS = {
  activeProjects: { value: 0, delta: "—" },
  deploysToday: { value: 0, delta: "—" },
  forgeRuns: { value: 0, delta: "—" },
  uptime: { value: "—", delta: "—" },
};
