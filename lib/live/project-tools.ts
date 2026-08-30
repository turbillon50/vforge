export type ToolStatus = "connected" | "available" | "missing";

export interface ToolIntegration {
  kind: string;
  label: string;
  status: ToolStatus;
  detail: string;
}

export interface VaultSecretMeta {
  id: string;
  name: string;
  provider: string | null;
  created_at: string | null;
  rotated_at: string | null;
  last_used_at: string | null;
}

const CATALOG: Array<{ kind: string; label: string }> = [
  { kind: "github", label: "GitHub" },
  { kind: "vercel", label: "Vercel" },
  { kind: "neon", label: "Neon" },
  { kind: "clerk", label: "Clerk" },
  { kind: "stripe", label: "Stripe" },
  { kind: "resend", label: "Resend" },
  { kind: "blob", label: "Vercel Blob" },
  { kind: "mcp", label: "MCP del proyecto" },
];

export function buildIntegrationCatalog(input: {
  github?: boolean;
  vercel?: boolean;
  neon?: boolean;
  clerk?: boolean;
  stripe?: boolean;
  resend?: boolean;
  blob?: boolean;
  rows?: Array<{ kind: string; label: string; status: string }>;
}): ToolIntegration[] {
  const extra = new Map(
    (input.rows ?? []).map((row) => [row.kind.toLowerCase(), row]),
  );
  return CATALOG.map((item) => {
    const flagged =
      item.kind === "github"
        ? input.github
        : item.kind === "vercel"
          ? input.vercel
          : item.kind === "neon"
            ? input.neon
            : item.kind === "clerk"
              ? input.clerk
              : item.kind === "stripe"
                ? input.stripe
                : item.kind === "resend"
                  ? input.resend
                  : item.kind === "blob"
                    ? input.blob
                    : false;
    const row = extra.get(item.kind);
    const connected = Boolean(flagged) || row?.status === "connected";
    return {
      kind: item.kind,
      label: row?.label || item.label,
      status: connected ? "connected" : "available",
      detail:
        item.kind === "mcp"
          ? "Cada app tiene su MCP. Pégalo en Claude, Cursor o Grok."
          : connected
            ? "Conectado a esta sala"
            : "Listo para conectar",
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
