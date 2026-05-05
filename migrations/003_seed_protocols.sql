-- -----------------------------------------------------------
-- Migration 003 — Seed protocolos vForge + lessons del día 1
--
-- Carga 4 entradas en knowledge_base que V leerá en CADA sesión:
--   - protocolo NUEVO    (kind=method)
--   - protocolo RESCATE  (kind=method)
--   - protocolo HUNTER   (kind=method, futuro)
--   - lesson: deploy de Rivones (Vite outDir gotcha + DNS Vercel + name.com)
-- -----------------------------------------------------------

INSERT INTO knowledge_base (kind, title, content, tags, source, created_by) VALUES
(
  'method',
  'Protocolo NUEVO — proyecto desde cero',
  'Cuando Luis dice "arrancar proyecto nuevo X" o "modo NUEVO", sigue este flujo:

1. Pregunta lo mínimo: qué hace, audiencia, 3-5 features core, marca/vibe.
2. Genera master prompt para v0.dev (formato vForge: identidad + tokens + screens + tono).
3. Sugiere repo name (default: turbillon50/<nombre-en-kebab-case>).
4. Cuando v0 exporte a GitHub, audita el repo con github_get_repo + github_read_file.
5. Despliega en Vercel: vercel_create_project con framework auto-detect, gitRepository linkeado.
6. Si Luis pide dominio: vercel_add_domain + vercel_get_domain_config + namecom_upsert_record.
7. Memory_save lo importante (broker, audiencia, decisión de tech).

Stack default heredado del método vForge: Next 16 / Vite + React 19 + Tailwind 4 + shadcn + Neon DB.

NO arranques con Railway worker hasta que sepas qué broker / WebSocket persistente se necesita.',
  ARRAY['protocol', 'nuevo', 'workflow'],
  'docs/method.md#protocolos',
  'operator_luis'
),
(
  'method',
  'Protocolo RESCATE — repo existente roto',
  'Cuando Luis dice "rescate de X", "modo RESCATE", o "tengo este repo con problemas":

1. github_get_repo → metadata, lenguaje, default_branch.
2. github_list_commits → patrón de desarrollo, último activity.
3. github_read_file en orden: README → package.json → archivos de config (vite.config, next.config, vercel.json) → 2-3 archivos de código clave.
4. Diagnóstico estructurado:
   - Stack actual y distancia del método vForge
   - Qué funciona, qué está roto, qué falta
   - Decisión: PATCH (cambios mínimos) vs REWRITE (master prompt nuevo conservando learnings)
5. Plan numerado con estimación por paso.
6. Si Luis aprueba PATCH: aplicar cambios concretos (file:line).
7. Si Luis aprueba REWRITE: nuevo master prompt → v0 → audit del nuevo repo.

Para deploy: vercel_create_project del repo (cuidado con monorepos pnpm — leer el vercel.json del repo PRIMERO, no asumir).
LECCIÓN aprendida en Rivones: Vite con build.outDir personalizado se peleaba con outputDirectory por default de Vercel. Verificar antes con github_read_file de vite.config.ts.',
  ARRAY['protocol', 'rescate', 'workflow'],
  'docs/method.md#protocolos',
  'operator_luis'
),
(
  'method',
  'Protocolo HUNTER — búsqueda externa (futuro)',
  'Cuando Luis active el "modo HUNTER" (no implementado todavía):

Buscar oportunidades fuera del catálogo de turbillon50: trends en GitHub, repos populares en un nicho, ideas de producto, benchmarking competitivo.

Tools necesarias (M1+):
- github_search_repos (global, no solo del operador)
- web_search / web_fetch
- npm_trending / producthunt_trending

Estado: roadmap, no cableado todavía.',
  ARRAY['protocol', 'hunter', 'roadmap'],
  'docs/method.md#protocolos',
  'operator_luis'
),
(
  'lesson',
  'Deploy Rivones (2026-05-04): Vite outDir + DNS Vercel + Name.com',
  'Lección 1 — Vite + monorepo pnpm + outDir personalizado:
El repo turbillon50/rivones tiene vite.config.ts con `build.outDir = "dist/public"` (custom para Replit). Vercel buscaba `dist/` por default → 404. Tres opciones de fix:
  a) Setear outputDirectory="dist/public" en proyecto Vercel
  b) Usar repo root como rootDirectory → el outer vercel.json toma el control con su propia config
  c) Hardcodear en vercel.json interno
La opción (b) ganó porque el outer vercel.json ya tenía buildCommand correcto + rewrites SPA. Antes de configurar Vercel para un repo, SIEMPRE github_read_file de vite.config.ts y vercel.json (root + cualquier subdirectorio) para ver dónde escribe Vite y qué espera Vercel.

Lección 2 — Vercel SSO Protection:
Por default los proyectos nuevos del team luis-projects-48b011f9 traen ssoProtection={"deploymentType":"all_except_custom_domains"}. Bloquea acceso público con HTTP 401. Después de crear proyecto, PATCH ssoProtection=null si es un sitio público.

Lección 3 — Name.com username = email:
La auth básica de api.name.com pide "username" pero el username NO es turbillon50 ni Tirbillon50 — es turbillon50@gmail.com (email completo del registrante). Los otros dos dan 403.

Lección 4 — Vercel A target apex:
Los Vercel A records recomendados están versionados. La rank=1 actual es 216.150.1.1 (no la legacy 76.76.21.21). Usar siempre vercel_get_domain_config recommendedIPv4[0].value[0] en vez de hardcodear.

Lección 5 — TLS provisioning:
Después de DNS válido, Vercel tarda 10-90s en aprovisionar Let''s Encrypt cert. HTTP funciona inmediato, HTTPS devuelve 503 mientras tanto.',
  ARRAY['lesson', 'vercel', 'namecom', 'rivones', 'monorepo', 'vite'],
  'session_2026-05-04_rivones',
  'operator_luis'
)
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('003_seed_protocols')
  ON CONFLICT (version) DO NOTHING;
