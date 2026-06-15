/**
 * VForge MCP — RBAC + multi-tenant isolation model.
 *
 * Every request to /api/mcp carries (at most) a Bearer token. That token
 * resolves to an `McpPrincipal` with a SCOPE that decides what it can touch:
 *
 *   admin   → the operator/owner (Luis). Sees everything. No org filter.
 *             The DB column mcp_tokens.scope stores this as either 'admin'
 *             (historical) or 'operator' (canonical owner label); the token
 *             resolver normalizes BOTH to this `admin` runtime scope, so the
 *             same token grants full visibility from any MCP client.
 *   client  → a tenant. Sees ONLY rows where org_id = principal.orgId.
 *             Never another tenant's data, never credential brain files.
 *   public  → marketing only. 401 on every data tool. The absence of a
 *             token is also treated as `public`.
 *
 * Tools are split in two buckets (see TOOL_KIND):
 *   "public" → no private data. Callable by ANY scope, even public / no auth.
 *              These are getting_started, vforge_method, help — the living
 *              README / method / help surface. Pure marketing.
 *   "data"   → reads or acts on private/tenant data. Requires a valid
 *              admin|client token. public scope (or no token) → 401.
 *
 * This file is the single source of truth for that policy. Both /api/mcp and
 * /api/mcp/public import from here so the gate can never drift between them.
 */

export type McpScope = "admin" | "client" | "public";

export interface McpPrincipal {
  /** Clerk user id behind the token. null for anonymous / public. */
  userId: string | null;
  scope: McpScope;
  /** Tenant key. null for admin (filter bypassed) and for anonymous. */
  orgId: string | null;
}

/** The anonymous principal: no token => public scope, no data access. */
export const ANON_PRINCIPAL: McpPrincipal = {
  userId: null,
  scope: "public",
  orgId: null,
};

/**
 * Tool classification. EVERY tool the server exposes must be listed here.
 * If a tool is missing it defaults to "data" (fail-closed): an unclassified
 * tool is never accidentally public.
 */
export type ToolKind = "public" | "data";

export const TOOL_KIND: Record<string, ToolKind> = {
  // ---- PUBLIC (marketing, no private data) ----
  getting_started: "public",
  vforge_method: "public",
  help: "public",

  // ---- DATA (tenant / private, admin|client only) ----
  vforge_project_status: "data",
  vforge_payments: "data",
  vforge_apps_health: "data",
  vforge_brain_search: "data",
  vforge_skill_list: "data",
  vforge_integration_plan: "data",
  vforge_recommend_stack: "data",
  vforge_create_repo: "data",
  vforge_deploy: "data",
  vforge_scaffold_project: "data",
  vforge_execute_skill: "data",

  // ---- OPERADOR (fragua Vulcano) — rol Owner/Associate, NUNCA public ----
  // ---- AGENT TOOLS (vulcano_boot, brain_exec, etc.) — solo admin ----
  vulcano_boot: "data",
  vulcano_brain_exec: "data",
  vulcano_brain_query: "data",
  vulcano_update_project: "data",
  vulcano_save_lesson: "data",
  vulcano_memory_search: "data",

  // Mapeo de roles: Owner → scope `admin` (operador), Associate → scope
  // `client` (cuenta conectada con token válido). Ambos son "data": el gate
  // de datos (admin|client) ya rebota a public/anon con 401, que es justo
  // "Owner o Associate, nunca public". Ver OPERATOR_TOOLS abajo.
  vulcano_taller_status: "data",
  vulcano_dispatch: "data",
  vulcano_brain_module: "data",
  vulcano_salud: "data",
  v_instruct: "data",
};

/**
 * Tools de OPERADOR de la fragua. Son "data" (requieren token admin|client,
 * nunca public), y además quedan marcadas aquí explícitamente para que el
 * gate sea legible: estas tocan la cola real de trabajo de la empresa
 * (dispatch_queue) y la doctrina/salud de la fábrica. Owner = admin,
 * Associate = client. Un token public/ausente jamás las ve ni las llama.
 */
export const OPERATOR_TOOLS: ReadonlySet<string> = new Set([
  "vulcano_taller_status",
  "vulcano_dispatch",
  "vulcano_brain_module",
  "vulcano_salud",
  // Agent tools — solo admin (Owner)
  "vulcano_boot",
  "vulcano_brain_exec",
  "vulcano_brain_query",
  "vulcano_update_project",
  "vulcano_save_lesson",
  "vulcano_memory_search",
  "v_instruct",
]);

export function isOperatorTool(name: string): boolean {
  return OPERATOR_TOOLS.has(name);
}

/** Owner (admin) o Associate (client) — el rol exigido por las tools de operador. */
export function canUseOperatorTools(principal: McpPrincipal): boolean {
  return principal.scope === "admin" || principal.scope === "client";
}

/** Fail-closed: unknown tools are treated as data (auth required). */
export function toolKind(name: string): ToolKind {
  return TOOL_KIND[name] ?? "data";
}

export function isPublicTool(name: string): boolean {
  return toolKind(name) === "public";
}

/** Can this principal CALL this tool? Public tools: always. Data: admin|client. Operator tools: admin ONLY. */
export function canCallTool(principal: McpPrincipal, name: string): boolean {
  if (isPublicTool(name)) return true;
  // Tools de operador (brain_exec, brain_query, shell, deploy real) — solo admin (Luis)
  if (isOperatorTool(name)) return principal.scope === "admin";
  return principal.scope === "admin" || principal.scope === "client";
}

/** Does this principal have access to ANY data tool? */
export function hasDataAccess(principal: McpPrincipal): boolean {
  return principal.scope === "admin" || principal.scope === "client";
}

export function isAdmin(principal: McpPrincipal): boolean {
  return principal.scope === "admin";
}
