import type { MetadataRoute } from "next";

// Las consolas privadas y las APIs no se indexan; la vitrina pública sí.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/app/", "/workspace/", "/onboarding", "/s/", "/offline"],
      },
    ],
    sitemap: "https://vforge.site/sitemap.xml",
    host: "https://vforge.site",
  };
}
