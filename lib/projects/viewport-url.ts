export interface ProjectViewportFields {
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  vercel_url: string | null;
  domain: string | null;
}

export interface ResolvedProjectViewports {
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
}

/**
 * Normaliza una URL publicable sin permitir protocolos ejecutables ni
 * credenciales embebidas. Los proyectos históricos suelen guardar sólo el
 * dominio, así que un host sin esquema se interpreta como HTTPS.
 */
export function normalizePublishedUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Panel institucional V·Momentum / Ssante: siempre vive en `/admin` del deploy.
 * Si el proyecto no tiene admin_url explícita, se deriva del dominio o Vercel.
 */
export function resolveInstitutionalAdminUrl(
  base: string | null | undefined,
): string | null {
  const normalized = normalizePublishedUrl(base ?? null);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    // No pisar si ya apunta a /admin
    const path = url.pathname.replace(/\/+$/, "") || "";
    if (path === "/admin" || path.endsWith("/admin")) return url.href;
    url.pathname = "/admin";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Resuelve los viewports históricos sin escribir en la base.
 *
 * Escritorio y móvil pueden compartir el deploy responsive.
 * Administración: URL explícita o, como base institucional, `{site}/admin`
 * (Protocolo Estandarte / vmomentum-panel-core).
 */
export function resolveProjectViewportUrls(
  project: ProjectViewportFields,
): ResolvedProjectViewports {
  const publishedFallback =
    normalizePublishedUrl(project.vercel_url) ??
    normalizePublishedUrl(project.domain);

  const explicitAdmin = normalizePublishedUrl(project.admin_url);

  return {
    desktop_url:
      normalizePublishedUrl(project.desktop_url) ?? publishedFallback,
    mobile_url:
      normalizePublishedUrl(project.mobile_url) ?? publishedFallback,
    admin_url: explicitAdmin ?? resolveInstitutionalAdminUrl(publishedFallback),
  };
}
