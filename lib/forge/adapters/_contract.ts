/**
 * Canonical ForgeAdapter contract.
 *
 * Every external capability that the Forge brain (V) can invoke implements
 * this interface. See `docs/architecture.md §3.1` for the design and
 * `docs/decisions/009-external-service-stack.md` for the catalog.
 *
 * Implementation files live alongside this one (`openrouter.ts`,
 * `e2b-sandbox.ts`, …). Each file is added when its milestone (M3, M5, M9,
 * etc.) lands — not before, to avoid orphan stubs.
 */

/** Permission rings — see AGENTS.md §2 and architecture.md §4. */
export type Ring = 0 | 1 | 2 | 3;

/** Capability tags used by the routing policy (lib/forge/routing.ts). */
export type Capability =
  | "reasoning"
  | "code-edit"
  | "code-exec"
  | "classification"
  | "image-gen"
  | "voice-transcribe"
  | "voice-tts"
  | "web-search"
  | "browser"
  | "repo-op"
  | "deploy"
  | "dns-op"
  | "secret-rw"
  | "email"
  | "bg-job"
  | "realtime"
  | "billing"
  | "apikey-issue"
  | "edge-db";

/** Read-only handle the adapter uses to fetch its credentials. */
export interface VaultReader {
  getOperatorSecret(name: string): Promise<string | null>;
  getProjectSecret(projectId: string, name: string): Promise<string | null>;
}

/** Event sink — adapter emits progress, the brain forwards to SSE. */
export type AdapterEvent =
  | { type: "step"; label: string }
  | { type: "stream"; chunk: string }
  | { type: "warn"; message: string };

export interface AdapterContext {
  /** Vercel user id (operator_luis in Phase 1, real Clerk user_id in Phase 2). */
  userId: string;
  /** Current chat session id, for audit correlation. */
  sessionId: string;
  /** Project the call belongs to, if scoped. */
  projectId?: string | null;
  /** Aborts the call when the user disconnects from the SSE stream. */
  signal: AbortSignal;
  /** Vault accessor — adapter MUST NOT read env directly. */
  vault: VaultReader;
  /** Optional progress sink — bubbled to the SSE stream. */
  emit?: (event: AdapterEvent) => void;
}

export interface ForgeAdapter<Input, Output> {
  /** Stable identifier — used in routing tables, audit logs, model registry. */
  readonly name: string;
  /** Privilege ring — 2+ require human confirmation in the UI. */
  readonly ring: Ring;
  /** What this adapter knows how to do; consumed by the router. */
  readonly capabilities: readonly Capability[];
  /** Best-effort USD estimate, used for cost caps + audit. */
  costPerCall(input: Input): number;
  /** Quick health check; called by /api/admin/health. */
  health(ctx: Pick<AdapterContext, "vault">): Promise<AdapterHealth>;
  /** The actual call. Adapter is responsible for its own SDK + auth. */
  execute(input: Input, ctx: AdapterContext): Promise<Output>;
}

export type AdapterHealth =
  | { status: "ok" }
  | { status: "missing-key"; key: string }
  | { status: "degraded"; reason: string }
  | { status: "error"; message: string };

/** Helper: throw a normalized error so the brain handles them uniformly. */
export class AdapterError extends Error {
  constructor(
    public readonly adapter: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${adapter}] ${message}`);
    this.name = "AdapterError";
  }
}
