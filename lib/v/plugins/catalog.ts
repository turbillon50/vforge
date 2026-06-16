/**
 * Catálogo de plugins de V.
 *
 *  - NATIVE_PLUGINS:      se siembran en `v_plugins` en cada heal. Son los 5
 *                         plugins base que V trae de fábrica.
 *  - INSTALLABLE_CATALOG: registro "global" de plugins que V puede INSTALAR a
 *                         petición de Luis ("V, instala el plugin de facturación
 *                         CFDI"). Instalar = copiar la definición a `v_plugins`
 *                         y activarla. Pueden ser nativos (handler) o externos
 *                         (URL).
 */

export interface PluginDef {
  slug: string;
  name: string;
  description: string;
  trigger_pattern: string;
  /** "internal:<slug>" para nativos con handler; URL http(s) para externos. */
  endpoint: string;
  version: string;
  source: "native" | "installed" | "external";
  config?: Record<string, unknown>;
}

/** Los 5 plugins nativos — sembrados siempre. */
export const NATIVE_PLUGINS: PluginDef[] = [
  {
    slug: "higgsfield",
    name: "Higgsfield — Generación de imágenes",
    description: "Genera imágenes a partir de una descripción y devuelve la URL.",
    trigger_pattern: "\\bim[aá]gen\\b|vis[uú]aliz|mu[eé]strame|gen[eé]ra\\w*\\s+(?:una\\s+)?imagen|render(?:iza)?",
    endpoint: "internal:higgsfield",
    version: "1.0.0",
    source: "native",
  },
  {
    slug: "deploy",
    name: "Deploy — Publicación a Vercel",
    description: "Lanza un deploy (git → Vercel) de un proyecto y devuelve la URL.",
    trigger_pattern: "deploya|despliega|publica|lanza(?:r)?(?: a producci[oó]n)?",
    endpoint: "internal:deploy",
    version: "1.0.0",
    source: "native",
  },
  {
    slug: "whatsapp",
    name: "WhatsApp — Notificaciones",
    description: "Envía un mensaje de WhatsApp a Luis o a un número via Baileys.",
    trigger_pattern: "manda(?:le)? a|av[ií]sa(?:le)?|notifica(?:r)?|mensaje a|escr[ií]bele a",
    endpoint: "internal:whatsapp",
    version: "1.0.0",
    source: "native",
  },
  {
    slug: "analisis",
    name: "Análisis — Métricas de proyectos",
    description: "Lee métricas del portafolio o de un proyecto y reporta.",
    trigger_pattern: "anal[ií]za|reporta(?:r)?|c[oó]mo va|estado de|m[eé]tricas de",
    endpoint: "internal:analisis",
    version: "1.0.0",
    source: "native",
  },
  {
    slug: "propuesta",
    name: "Propuesta — Cotizaciones",
    description: "Genera una propuesta comercial en markdown (PDF al confirmar).",
    trigger_pattern: "propuesta para|cotiza(?:r)?|precio de|cotizaci[oó]n para|presupuesto para",
    endpoint: "internal:propuesta",
    version: "1.0.0",
    source: "native",
  },
];

/**
 * Registro global de plugins INSTALABLES (más allá de los nativos). V busca aquí
 * cuando Luis pide instalar algo nuevo. Un plugin externo se sirve por URL; uno
 * nativo nuevo requeriría además su handler en handlers.ts.
 */
export const INSTALLABLE_CATALOG: PluginDef[] = [
  ...NATIVE_PLUGINS,
  {
    slug: "cfdi",
    name: "Facturación CFDI",
    description: "Genera facturas CFDI 4.0 (México) vía endpoint externo de timbrado.",
    trigger_pattern: "factura(?:r)?|cfdi|timbra(?:r)?|emite(?:r)? factura",
    endpoint: process.env.CFDI_PLUGIN_URL || "https://plugins.vmomentum.site/cfdi",
    version: "0.1.0",
    source: "external",
    config: { needsEnv: ["CFDI_PLUGIN_URL", "CFDI_API_KEY"] },
  },
];

/** Busca una definición instalable por slug o por nombre aproximado. */
export function findInstallable(query: string): PluginDef | null {
  const q = query.toLowerCase().trim();
  return (
    INSTALLABLE_CATALOG.find((p) => p.slug === q) ||
    INSTALLABLE_CATALOG.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.slug)) ||
    null
  );
}
