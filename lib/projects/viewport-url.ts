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
 * Resuelve los viewports históricos sin escribir en la base.
 *
 * Escritorio y móvil pueden compartir el deploy responsive cuando sus URLs
 * explícitas aún no existían. Administración nunca se infiere: sólo se expone
 * cuando fue registrada de forma intencional.
 */
export function resolveProjectViewportUrls(
  project: ProjectViewportFields,
): ResolvedProjectViewports {
  const publishedFallback =
    normalizePublishedUrl(project.vercel_url) ??
    normalizePublishedUrl(project.domain);

  return {
    desktop_url:
      normalizePublishedUrl(project.desktop_url) ?? publishedFallback,
    mobile_url:
      normalizePublishedUrl(project.mobile_url) ?? publishedFallback,
    admin_url: normalizePublishedUrl(project.admin_url),
  };
}
