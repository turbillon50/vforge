import type { MetadataRoute } from "next";

const SITE = "https://vforge.site";

// Solo rutas públicas y estables. Lo privado vive detrás de sesión y no se lista.
const RUTAS: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/mcp", priority: 0.9, changeFrequency: "weekly" },
  { path: "/labs", priority: 0.8, changeFrequency: "monthly" },
  { path: "/developers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/marketplace", priority: 0.7, changeFrequency: "weekly" },
  { path: "/manifiesto", priority: 0.6, changeFrequency: "yearly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/status", priority: 0.4, changeFrequency: "daily" },
  { path: "/terminos", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return RUTAS.map(({ path, priority, changeFrequency }) => ({
    url: SITE + path,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
