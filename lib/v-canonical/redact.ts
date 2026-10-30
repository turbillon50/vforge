export function redactText(input: string): string {
  return input
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[CONEXIÓN PROTEGIDA]")
    .replace(
      /\b(?:sk[-_]|csk-|gh[pousr]_|github_pat_|vfmcp_|mk_|tk_)[A-Za-z0-9_-]{16,}\b/g,
      "[TOKEN PROTEGIDO]",
    )
    .replace(/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[TOKEN PROTEGIDO]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      "[SESIÓN PROTEGIDA]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, "Bearer [PROTEGIDO]")
    .replace(
      /((?:[\w-]*(?:api[_-]?key|token|secret|password|mcp[_-]?key|router[_-]?key|private[_-]?key)[\w-]*|contraseña)["']?\s*[:=]\s*["']?)(?!\[)[^\s"',;}\]]{8,}/gi,
      "$1[PROTEGIDO]",
    );
}
export function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        typeof v === "string" &&
        /(?:api_?key|secret|password|credential|access_?token|auth_?tag|ciphertext|private_?key|(?:^|_)token(?:_|$))/i.test(
          k,
        )
          ? "[PROTEGIDO]"
          : redactValue(v),
      ]),
    );
  return value;
}
