export function redactText(input: string): string {
  return input
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[CONEXIÓN PROTEGIDA]")
    .replace(
      /\b(?:sk[-_]|gh[pousr]_|github_pat_|vfmcp_|mk_|tk_)[A-Za-z0-9_-]{16,}\b/g,
      "[TOKEN PROTEGIDO]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, "Bearer [PROTEGIDO]")
    .replace(
      /((?:api[_ -]?key|access[_ -]?token|secret|password|contraseña)\s*[:=]\s*)[^\s,;]{8,}/gi,
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
        /(?:api_?key|secret|password|credential|access_?token|auth_?tag|ciphertext)/i.test(
          k,
        )
          ? "[PROTEGIDO]"
          : redactValue(v),
      ]),
    );
  return value;
}
