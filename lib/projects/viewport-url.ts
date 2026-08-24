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

/** Panel institucional /ops: {site}/admin con flag embed para iframes VForge. */
export function resolveInstitutionalAdminUrl(
  base: string | null | undefined,
): string | null {
  const normalized = normalizePublishedUrl(base ?? null);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const path = url.pathname.replace(/\/+$/, "") || "";
    if (path !== "/admin" && !path.endsWith("/admin")) {
      url.pathname = "/admin";
    }
    url.searchParams.set("embed", "1");
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function withAdminEmbed(admin: string | null): string | null {
  if (!admin) return null;
  try {
    const url = new URL(admin);
    if (!url.searchParams.has("embed")) url.searchParams.set("embed", "1");
    return url.href;
  } catch {
    return admin;
  }
}

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
    admin_url: withAdminEmbed(
      explicitAdmin ?? resolveInstitutionalAdminUrl(publishedFallback),
    ),
  };
}
