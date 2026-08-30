/**
 * Scopes persistidos en user_secrets. El OAuth propio guarda "github" /
 * "vercel"; el espejo de Clerk guarda "github-clerk" / "vercel-clerk".
 * La UI de onboarding/workspace solo entiende los nombres canónicos.
 */
export function normalizeConnectionScopes(scopes: string[]): string[] {
  const out = new Set<string>();
  for (const raw of scopes) {
    if (raw === "github" || raw === "github-clerk") out.add("github");
    else if (raw === "vercel" || raw === "vercel-clerk") out.add("vercel");
    else if (raw) out.add(raw);
  }
  return [...out];
}

export function oauthCallbackMessage(
  provider: "GitHub" | "Vercel",
  status: string | null,
): string | null {
  if (!status || status === "connected") return null;
  if (status === "error_state" || status === "error_sin_sesion") {
    return `No pudimos confirmar tu cuenta de ${provider}. Vuelve a conectar.`;
  }
  if (status === "error_no_code" || status === "error_token" || status === "error_exchange") {
    return `${provider} no devolvió una conexión válida. Vuelve a intentar.`;
  }
  if (status.startsWith("err:") || status.startsWith("error_")) {
    return `No se pudo conectar ${provider}. Vuelve a intentar.`;
  }
  return `No se pudo conectar ${provider}. Vuelve a intentar.`;
}
