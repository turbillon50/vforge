/**
 * Plugin Registry — acceso a la tabla `v_plugins` en Neon.
 *
 * Responsabilidades:
 *   - ensureVPluginsTable(): crea la tabla + índices (idempotente, llamado
 *     desde el auto-heal).
 *   - seedNativePlugins(): siembra los 5 plugins nativos si faltan.
 *   - loadActivePlugins(): trae los plugins activos (cacheados 30s en proceso).
 *   - matchPlugins(message): cuáles activan con el mensaje (regex).
 *   - registerPlugin() / setPluginActive(): instalar/togglear.
 */
import { sql, queryAll } from "@/lib/db/client";
import { NATIVE_PLUGINS, type PluginDef } from "./catalog";
import type { PluginRow } from "./types";

let _cache: { rows: PluginRow[]; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

/** Crea la tabla v_plugins + índices. Idempotente. */
export async function ensureVPluginsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS v_plugins (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug            text UNIQUE NOT NULL,
      name            text NOT NULL,
      description     text NOT NULL DEFAULT '',
      trigger_pattern text NOT NULL,
      endpoint        text NOT NULL,
      active          boolean NOT NULL DEFAULT true,
      version         text NOT NULL DEFAULT '1.0.0',
      source          text NOT NULL DEFAULT 'external',
      config          jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_v_plugins_active ON v_plugins (active) WHERE active`;
}

/** Siembra los plugins nativos (no pisa los ya existentes ni su estado active). */
export async function seedNativePlugins(): Promise<void> {
  for (const p of NATIVE_PLUGINS) {
    await sql`
      INSERT INTO v_plugins (slug, name, description, trigger_pattern, endpoint, version, source, config)
      VALUES (${p.slug}, ${p.name}, ${p.description}, ${p.trigger_pattern}, ${p.endpoint}, ${p.version}, ${p.source}, '{}'::jsonb)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        trigger_pattern = EXCLUDED.trigger_pattern,
        endpoint = EXCLUDED.endpoint,
        version = EXCLUDED.version,
        source = EXCLUDED.source,
        updated_at = now()
    `;
  }
  _cache = null;
}

/** Plugins activos, con caché corto en proceso. */
export async function loadActivePlugins(): Promise<PluginRow[]> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.rows;
  const rows = await queryAll<PluginRow>(
    `SELECT id, slug, name, description, trigger_pattern, endpoint, active, version, source, config
       FROM v_plugins WHERE active = true`,
  );
  _cache = { rows, at: Date.now() };
  return rows;
}

/** Limpia el caché (tras instalar/togglear). */
export function invalidatePluginCache(): void {
  _cache = null;
}

export interface PluginMatch {
  plugin: PluginRow;
  match: RegExpMatchArray;
}

/** Plugins cuyo trigger_pattern hace match con el mensaje. */
export async function matchPlugins(message: string): Promise<PluginMatch[]> {
  const plugins = await loadActivePlugins().catch(() => [] as PluginRow[]);
  const hits: PluginMatch[] = [];
  for (const p of plugins) {
    try {
      const re = new RegExp(p.trigger_pattern, "i");
      const m = message.match(re);
      if (m) hits.push({ plugin: p, match: m });
    } catch {
      // Regex inválido en DB → ignorar ese plugin, no romper el match global.
    }
  }
  return hits;
}

/** Registra/actualiza un plugin (instalación). Devuelve la fila. */
export async function registerPlugin(def: PluginDef, activate = true): Promise<PluginRow> {
  const rows = await queryAll<PluginRow>(
    `INSERT INTO v_plugins (slug, name, description, trigger_pattern, endpoint, version, source, active, config)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name, description = EXCLUDED.description,
       trigger_pattern = EXCLUDED.trigger_pattern, endpoint = EXCLUDED.endpoint,
       version = EXCLUDED.version, source = EXCLUDED.source,
       active = EXCLUDED.active, config = EXCLUDED.config, updated_at = now()
     RETURNING id, slug, name, description, trigger_pattern, endpoint, active, version, source, config`,
    [
      def.slug,
      def.name,
      def.description,
      def.trigger_pattern,
      def.endpoint,
      def.version,
      def.source,
      activate,
      JSON.stringify(def.config ?? {}),
    ],
  );
  invalidatePluginCache();
  return rows[0];
}

/** Activa/desactiva un plugin por slug. */
export async function setPluginActive(slug: string, active: boolean): Promise<boolean> {
  const rows = await queryAll<{ slug: string }>(
    `UPDATE v_plugins SET active = $2, updated_at = now() WHERE slug = $1 RETURNING slug`,
    [slug, active],
  );
  invalidatePluginCache();
  return rows.length > 0;
}

/** Lista TODOS los plugins (activos e inactivos) para el panel/registry. */
export async function listAllPlugins(): Promise<PluginRow[]> {
  return queryAll<PluginRow>(
    `SELECT id, slug, name, description, trigger_pattern, endpoint, active, version, source, config
       FROM v_plugins ORDER BY source, name`,
  );
}
