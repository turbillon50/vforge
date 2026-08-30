export type ToolStatus = "connected" | "available" | "missing";

export interface ToolIntegration {
  kind: string;
  label: string;
  status: ToolStatus;
  detail: string;
  hint: string;
  secretHint: string | null;
}

export interface VaultSecretMeta {
  id: string;
  name: string;
  provider: string | null;
  created_at: string | null;
  rotated_at: string | null;
  last_used_at: string | null;
}

export interface VercelToolAction {
  id: string;
  label: string;
  detail: string;
  write: boolean;
}

export const FORBIDDEN_AUTOMATION = ["n8n", "zapier", "make", "make.com"] as const;

export const VERCEL_TOOL_ACTIONS: VercelToolAction[] = [
  { id: "project", label: "Proyecto", detail: "Id, framework y URL de producción", write: false },
  { id: "deploys", label: "Deploys", detail: "Últimos deploys con estado, rama y URL", write: false },
  { id: "inspector", label: "Inspector", detail: "Abrir el deploy en el dashboard de Vercel", write: false },
  { id: "promote", label: "Promover", detail: "Asignar un preview READY a producción", write: true },
  { id: "redeploy", label: "Redeploy", detail: "Disparar producción desde main", write: true },
  { id: "domains", label: "Dominios", detail: "Lista, verificación y alta de dominio", write: true },
  { id: "env", label: "Env", detail: "Nombres y alta. El valor nunca se lee.", write: true },
];

const CATALOG: Array<{
  kind: string;
  label: string;
  hint: string;
  secretHint: string | null;
}> = [
  { kind: "github", label: "GitHub", hint: "Repo, PRs y deploys desde main.", secretHint: null },
  { kind: "vercel", label: "Vercel", hint: "Deploys, dominios, env y promover.", secretHint: "VERCEL_TOKEN" },
  { kind: "neon", label: "Neon", hint: "Postgres de la app.", secretHint: "DATABASE_URL" },
  { kind: "clerk", label: "Clerk", hint: "Auth de usuarios de la app.", secretHint: "CLERK_SECRET_KEY" },
  { kind: "stripe", label: "Stripe", hint: "Pagos con tarjeta.", secretHint: "STRIPE_SECRET_KEY" },
  { kind: "mercadopago", label: "Mercado Pago", hint: "Pagos LATAM.", secretHint: "MERCADOPAGO_ACCESS_TOKEN" },
  { kind: "resend", label: "Resend", hint: "Correo transaccional.", secretHint: "RESEND_API_KEY" },
  { kind: "blob", label: "Vercel Blob", hint: "Archivos y media.", secretHint: "BLOB_READ_WRITE_TOKEN" },
  { kind: "namecom", label: "Name.com", hint: "Dominios y DNS.", secretHint: "NAMECOM_API_TOKEN" },
  { kind: "hetzner", label: "Hetzner", hint: "Infra propia, MCP y runners.", secretHint: "HETZNER_API_TOKEN" },
  { kind: "mcp", label: "MCP del proyecto", hint: "Toda app debe tener su MCP. Pégalo en Claude, Cursor o Grok.", secretHint: null },
];

export function isForbiddenAutomation(kind: string): boolean {
  const normalized = kind.trim().toLowerCase();
  return FORBIDDEN_AUTOMATION.some((item) => normalized === item || normalized.includes(item));
}

export function buildIntegrationCatalog(input: {
  github?: boolean;
  vercel?: boolean;
  neon?: boolean;
  clerk?: boolean;
  stripe?: boolean;
  resend?: boolean;
  blob?: boolean;
  mercadopago?: boolean;
  namecom?: boolean;
  hetzner?: boolean;
  rows?: Array<{ kind: string; label: string; status: string }>;
}): ToolIntegration[] {
  const extra = new Map(
    (input.rows ?? [])
      .filter((row) => !isForbiddenAutomation(row.kind))
      .map((row) => [row.kind.toLowerCase(), row]),
  );
  const flaggedFor = (kind: string): boolean => {
    if (kind === "github") return Boolean(input.github);
    if (kind === "vercel") return Boolean(input.vercel);
    if (kind === "neon") return Boolean(input.neon);
    if (kind === "clerk") return Boolean(input.clerk);
    if (kind === "stripe") return Boolean(input.stripe);
    if (kind === "resend") return Boolean(input.resend);
    if (kind === "blob") return Boolean(input.blob);
    if (kind === "mercadopago") return Boolean(input.mercadopago);
    if (kind === "namecom") return Boolean(input.namecom);
    if (kind === "hetzner") return Boolean(input.hetzner);
    return false;
  };
  return CATALOG.map((item) => {
    const row = extra.get(item.kind);
    const connected = flaggedFor(item.kind) || row?.status === "connected";
    const status: ToolStatus = connected ? "connected" : "available";
    const detail =
      item.kind === "mcp"
        ? item.hint
        : connected
          ? "Conectado a esta sala"
          : item.secretHint
            ? `Listo. Guarda ${item.secretHint} en la bóveda.`
            : "Listo para conectar";
    return {
      kind: item.kind,
      label: row?.label || item.label,
      status,
      detail,
      hint: item.hint,
      secretHint: item.secretHint,
    };
  });
}

export function secretLooksLike(name: string, needle: string): boolean {
  return name.toUpperCase().includes(needle.toUpperCase());
}

export function maskSecretPreview(): string {
  return "••••••••";
}

export function isSafeSecretName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]{0,63}$/.test(name.trim());
}

export function isSafeDomain(value: string): boolean {
  const host = value.trim().toLowerCase();
  if (!host || host.includes("/") || host.includes(":") || host.includes("@")) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host);
}

export function parseGithubRepo(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\.git$/i, "");
  const fromUrl = trimmed.match(/github\.com[:/]+([^/]+\/[^/]+)(?:\/|$)/i);
  if (fromUrl?.[1]) return fromUrl[1].replace(/\.git$/i, "");
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) return trimmed;
  return null;
}

export function mcpClientConfig(input: { name: string; url: string }): {
  claude: Record<string, unknown>;
  cursor: Record<string, unknown>;
  grok: Record<string, unknown>;
} {
  const server = {
    url: input.url,
    headers: { Authorization: "Bearer PEGA_EL_TOKEN" },
  };
  return {
    claude: { mcpServers: { [input.name]: server } },
    cursor: { mcpServers: { [input.name]: server } },
    grok: { name: input.name, url: input.url, auth: "Bearer" },
  };
}

export function roomToolsBrief(): string {
  return [
    "HERRAMIENTAS DE LA SALA: Vercel (deploys, promover, redeploy, dominios, env sin valores), integraciones, bóveda cifrada y MCP por app.",
    "MCP: toda app debe tener su MCP. Incluye vforge_project_see (Navegador Pro + plugin Chrome que sí manda la foto). Sugiérelo y explica cómo pegarlo en Claude, Cursor o Grok. No uses n8n.",
  ].join(" ");
}
