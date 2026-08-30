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

function withAdminEmbed(admin) {
  if (!admin) return null;
  try {
    const url = new URL(admin);
    if (!url.searchParams.has("embed")) url.searchParams.set("embed", "1");
    return url.href;
  } catch {
    return admin;
  }
}

function distinctAdminUrl(admin, publicUrl) {
  if (!admin) return null;
  if (!publicUrl) return admin;
  try {
    const candidate = new URL(admin);
    const published = new URL(publicUrl);
    const sameSurface =
      candidate.origin === published.origin &&
      candidate.pathname.replace(/\/+$/, "") === published.pathname.replace(/\/+$/, "");
    return sameSurface ? null : admin;
  } catch {
    return null;
  }
}

export function resolveProjectViewportUrls(project) {
  const publishedFallback =
    normalizePublishedUrl(project.vercel_url) ??
    normalizePublishedUrl(project.domain);

  const explicitAdmin = normalizePublishedUrl(project.admin_url);
  const institutional = resolveInstitutionalAdminUrl(
    normalizePublishedUrl(project.desktop_url) ?? publishedFallback,
  );

  return {
    desktop_url:
      normalizePublishedUrl(project.desktop_url) ?? publishedFallback,
    mobile_url:
      normalizePublishedUrl(project.mobile_url) ?? publishedFallback,
    admin_url: withAdminEmbed(distinctAdminUrl(explicitAdmin ?? institutional, publishedFallback)),
  };
}
