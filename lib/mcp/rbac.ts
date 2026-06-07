/**
 * VForge MCP — RBAC + multi-tenant isolation model.
 *
 * Every request to /api/mcp carries (at most) a Bearer token. That token
 * resolves to an `McpPrincipal` with a SCOPE that decides what it can touch:
 *
 *   admin   → the operator (Luis). Sees everything. No org filter.
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
};

/** Fail-closed: unknown tools are treated as data (auth required). */
export function toolKind(name: string): ToolKind {
  return TOOL_KIND[name] ?? "data";
}

export function isPublicTool(name: string): boolean {
  return toolKind(name) === "public";
}

/** Can this principal CALL this tool? Public tools: always. Data: admin|client. */
export function canCallTool(principal: McpPrincipal, name: string): boolean {
  if (isPublicTool(name)) return true;
  return principal.scope === "admin" || principal.scope === "client";
}

/** Does this principal have access to ANY data tool? */
export function hasDataAccess(principal: McpPrincipal): boolean {
  return principal.scope === "admin" || principal.scope === "client";
}

export function isAdmin(principal: McpPrincipal): boolean {
  return principal.scope === "admin";
}
