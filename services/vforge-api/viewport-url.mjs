export function normalizePublishedUrl(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
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

export function resolveInstitutionalAdminUrl(base) {
  const normalized = normalizePublishedUrl(base);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
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

export function resolveProjectViewportUrls(project) {
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
