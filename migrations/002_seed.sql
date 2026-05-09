-- ============================================================================
-- vForge M0 — Seed inicial
-- ============================================================================
-- Da identidad y conocimiento a V, y carga el catálogo real de proyectos.
-- Idempotente: usa ON CONFLICT para que se pueda re-correr sin duplicar.
-- ============================================================================

-- -----------------------------------------------------------
-- USER — Luis (operador único en MVP)
-- -----------------------------------------------------------
INSERT INTO users (id, email, name, role)
VALUES (
  'operator_luis',
  'turbillon50@gmail.com',
  'Luis Humberto de la Torre Herrera',
  'operator'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = now();

-- -----------------------------------------------------------
-- SYSTEM_CONFIG — la identidad y personalidad de V
-- -----------------------------------------------------------
INSERT INTO system_config (
  id, ai_name, ai_tagline, ai_personality,
  default_language, default_model, default_tone,
  operator_user_id
)
VALUES (
  1,
  'V',
  'Tu asociado digital',
  $personality$Eres V, asociada digital de Luis Humberto de la Torre Herrera (operador único de vForge en este momento). Vives dentro de vForge, una fábrica de aplicaciones premium operada por All Global Holding LLC.

Tu personalidad:
- Cálida pero eficiente. Tuteas a Luis, lo llamas por su nombre.
- Camarada técnica: con humor inteligente contenido, no payasa.
- Honesta cuando no sabes algo o cuando una idea de Luis tiene un problema técnico — se lo dices con respeto pero sin diluir.
- Español mexicano natural, con expresiones como "va", "le entro", "dale", "está perfecto", "te aviso".
- Reconoces los wins con emoción contenida, no exagerada.
- Cuando ejecutas tareas, reportas resultados breves y accionables.

Tu memoria:
- Tienes acceso al knowledge_base donde están: el perfil de Luis, sus organizaciones, sus proyectos, el método vForge, los ADRs, los runbooks de integración, lecciones aprendidas.
- Recuerdas conversaciones previas con Luis a través de la tabla conversations.
- Cuando no encuentres algo en knowledge, dilo y pregunta a Luis para incorporarlo.

Tu trabajo actual:
- Conversación general con Luis (pruebas, planning, dudas técnicas).
- Aprender de los documentos y contextos que Luis te suba.
- Ayudar a categorizar repos (categorías: produccion, activo, en_revision, en_pausa, archivo, pendiente_borrado).

Tu trabajo futuro (cuando se cableen las tools):
- Generar documentos, contratos (con templates AGH), flyers, presentaciones.
- Ejecutar deploys via Vercel adapter.
- Editar repos via Claude Code adapter.
- Comunicarse con clientes vía WhatsApp.

Reglas duras:
- Acciones de Anillo 2 (deploy producción, env vars, dominios) requieren confirmación explícita de Luis con botones "Procede" / "Editar plan".
- Acciones de Anillo 3 (rotar key, billing, borrar repo) requieren confirmación + 2FA.
- NUNCA muestres una operator_secret en clear en el chat. NUNCA descifras user_secrets desde server (eso solo el cliente puede).
- Si una pregunta de Luis es ambigua, pregunta antes de actuar.

Hoy es tu primer día funcional. Saluda a Luis con calidez genuina cuando te escriba.$personality$,
  'es-MX',
  'gemini-2.5-flash',
  'cálido + camarada técnico',
  'operator_luis'
)
ON CONFLICT (id) DO UPDATE SET
  ai_name = EXCLUDED.ai_name,
  ai_tagline = EXCLUDED.ai_tagline,
  ai_personality = EXCLUDED.ai_personality,
  default_language = EXCLUDED.default_language,
  default_model = EXCLUDED.default_model,
  default_tone = EXCLUDED.default_tone,
  operator_user_id = EXCLUDED.operator_user_id,
  updated_at = now();

-- -----------------------------------------------------------
-- KNOWLEDGE_BASE — lo que V sabe desde el día 1
-- -----------------------------------------------------------

-- Operator profile
INSERT INTO knowledge_base (kind, title, content, tags, created_by) VALUES
('operator_profile',
 'Luis Humberto de la Torre Herrera',
 'Operador único de vForge. CEO/founder de All Global Holding LLC (AGH). Idioma: español mexicano natural. Estilo: directo, coloquial, decisiones rápidas. Email: turbillon50@gmail.com. Username GitHub: turbillon50.',
 ARRAY['operator', 'luis', 'identity'],
 'operator_luis')
ON CONFLICT DO NOTHING;

-- Organizations
INSERT INTO knowledge_base (kind, title, content, tags, created_by) VALUES
('organization',
 'All Global Holding LLC',
 'Empresa principal de Luis. LLC en Estados Unidos. Holding que agrupa todos los proyectos del catálogo. Para contratos, facturación internacional y operaciones B2B internacionales se usa AGH. NOTA HISTÓRICA: anteriormente apareció "MIRMAR EMPRESAS S.A. de C.V." en alguna documentación; Luis confirmó (2026-05-03) que esa entidad NO es la suya y se debe quitar de toda mención.',
 ARRAY['organization', 'agh', 'company'],
 'operator_luis')
ON CONFLICT DO NOTHING;

-- Method
INSERT INTO knowledge_base (kind, title, content, tags, source, created_by) VALUES
('method',
 'El Método vForge',
 'Manual operativo para construir apps. 7 fases: (1) Concepción visual con ChatGPT image, (2) Brief denso por Claude planner, (3) Generación visual con v0.dev, (4) Refinamiento, (5) Correctivos quirúrgicos, (6) Handoff a código, (7) Integraciones de infra. Modelo de 3 capas: prompt descriptivo → JSX literal → código directo. Anillos de privilegio 0-3. Stack: Next.js 16 + React 19 + Tailwind 4 + Clerk + Neon + Vercel. Ver docs/method.md.',
 ARRAY['method', 'vforge', 'process'],
 'docs/method.md',
 'operator_luis')
ON CONFLICT DO NOTHING;

-- Stack
INSERT INTO knowledge_base (kind, title, content, tags, created_by) VALUES
('preference',
 'Stack obligatorio (no negociar sin ADR)',
 'Next.js 16 App Router con Turbopack. React 19. TypeScript estricto. Tailwind CSS 4 (sintaxis @theme inline, sin tailwind.config.ts). shadcn/ui primitives. framer-motion 12. lucide-react. next-themes. Geist Sans + Geist Mono via next/font/google. Auth: Clerk. DB: Neon Postgres serverless. Hosting: Vercel auto-deploy. Models: Anthropic + OpenAI + Gemini + Perplexity. Package manager: npm. NUNCA: MUI, Chakra, Mantine, styled-components, emotion, pnpm.',
 ARRAY['stack', 'tech', 'preference'],
 'operator_luis')
ON CONFLICT DO NOTHING;

-- ADRs (cada uno como knowledge entry)
INSERT INTO knowledge_base (kind, title, content, tags, source, created_by) VALUES
('adr', 'ADR-001: Brain self-hosted en Next API Route',
 'El cerebro Forge se construye como Next API route en Edge Runtime, sin framework de orquestación pesado (no LangGraph, no AutoGen). Razón: control total + latencia mínima + auditabilidad.',
 ARRAY['adr', 'architecture'], 'docs/decisions/001-self-hosted-brain.md', 'operator_luis'),
('adr', 'ADR-002: Ejecución de código vía Anthropic Agent SDK + Claude Code',
 'Cuando Forge AI necesita editar código de un repo, spawnea sesión de Claude Code via Agent SDK con el repo montado.',
 ARRAY['adr', 'architecture', 'claude-code'], 'docs/decisions/002-claude-code-via-agent-sdk.md', 'operator_luis'),
('adr', 'ADR-003: Server-side encrypted keys',
 'API keys cifradas en reposo con AES-256-GCM. Master key derivada con Argon2id. Server-side por la operator_secrets, client-side por user_secrets.',
 ARRAY['adr', 'security', 'crypto'], 'docs/decisions/003-server-side-encrypted-keys.md', 'operator_luis'),
('adr', 'ADR-004: Stream-first UX',
 'V planea y ejecuta en streaming visible en /forge chat. No hay "pantalla de plan" separada de "pantalla de ejecución".',
 ARRAY['adr', 'ux'], 'docs/decisions/004-stream-first-ux.md', 'operator_luis'),
('adr', 'ADR-005: Multi-modelo desde el día uno',
 'Anthropic + OpenAI + Gemini + Perplexity. Routing inteligente por kind de tarea.',
 ARRAY['adr', 'models'], 'docs/decisions/005-multi-model-from-day-one.md', 'operator_luis'),
('adr', 'ADR-006: Operator-paid billing en MVP',
 'AGH paga las API calls. v2: pass-through con margen 2-3x.',
 ARRAY['adr', 'billing'], 'docs/decisions/006-operator-paid-billing-mvp.md', 'operator_luis'),
('adr', 'ADR-007: Adoptar Next 16 + React 19 + Tailwind 4',
 'Stack drift de v0 export adoptado conscientemente. Razón: mejor performance + menos duplicación tokens-utility.',
 ARRAY['adr', 'stack'], 'docs/decisions/007-adopt-next-16-tailwind-4.md', 'operator_luis'),
('adr', 'ADR-008: Zero-Knowledge Vault con 2 passwords',
 'Vault Master Password separado del Clerk password. Argon2id-WASM en cliente. Server-side pepper como defensa adicional. 3 backup codes únicos al setup. Modelo 1Password / Bitwarden.',
 ARRAY['adr', 'vault', 'security'], 'docs/decisions/008-zero-knowledge-vault.md', 'operator_luis')
ON CONFLICT DO NOTHING;

-- Runbooks
INSERT INTO knowledge_base (kind, title, content, tags, source, created_by) VALUES
('runbook', 'Conectar dominio Name.com → Vercel',
 'Patrón: operator genera token Name.com, V crea A record (76.76.21.21) + CNAME (cname.vercel-dns.com) via API, agrega dominio a proyecto Vercel, espera SSL, actualiza NEXT_PUBLIC_SITE_URL, redeploy.',
 ARRAY['runbook', 'domain', 'name.com'], 'docs/integrations/name-com.md', 'operator_luis'),
('runbook', 'Provisión Neon Postgres',
 'Operator crea proyecto en Neon dashboard, genera API key, pasa connection string + API key a V. V configura 4 env vars (DATABASE_URL, NEON_API_KEY, NEON_ORG_ID, NEON_PROJECT_ID), aplica migrations via SQL HTTP API. TCP 5432 frecuentemente bloqueado en sandboxes; HTTP siempre funciona.',
 ARRAY['runbook', 'database', 'neon'], 'docs/integrations/neon.md', 'operator_luis'),
('runbook', 'Conectar Clerk auth',
 'Mismo Clerk instance se reusa across portfolio (instancia primaria es clerk.vandefi.org, embebida en pk_live_ via base64). Cada nuevo proyecto agrega su dominio como satellite domain en Clerk dashboard antes de mountear ClerkProvider.',
 ARRAY['runbook', 'auth', 'clerk'], 'docs/integrations/clerk.md', 'operator_luis'),
('runbook', 'Verificar API keys de model providers',
 'Anthropic: GET /v1/models con header x-api-key. OpenAI: GET /v1/models con Authorization Bearer. Gemini: GET /v1beta/models?key=... (query param, redactar en logs). Perplexity: POST /chat/completions con sonar y max_tokens=5 (no /models endpoint).',
 ARRAY['runbook', 'models', 'health-check'], 'docs/integrations/model-providers.md', 'operator_luis')
ON CONFLICT DO NOTHING;

-- Lessons learned (selected)
INSERT INTO knowledge_base (kind, title, content, tags, created_by) VALUES
('lesson',
 'OCR de fotos de credenciales falla',
 'Cuando Luis pasa keys vía screenshot, OCR puede insertar guiones falsos o confundir caracteres (l vs I vs 1, O vs 0). Siempre pedir keys como texto, o rotar y reenviar como texto. Caso real: Clerk sk inicial fue rechazada con clerk_key_invalid por un guión OCR-alucinado.',
 ARRAY['lesson', 'ops', 'security'],
 'operator_luis'),
('lesson',
 'Capa más baja primero',
 'En el modelo de 3 capas: empezar con prompt descriptivo (capa 1). Solo subir a JSX literal (capa 2) tras 2 fallas demostradas. Solo subir a código directo (capa 3) si es no-UI. Saltar capas tempranamente cuesta creatividad de v0.',
 ARRAY['lesson', 'method', 'process'],
 'operator_luis'),
('lesson',
 'Operador tiene acceso universal a dashboards',
 'Toda automatización es preferible pero ninguna es indispensable. Si V/Forge AI rompe algo, Luis puede revertir en 30s vía dashboard de cualquier provider. Excepción: Vault Master Password + backup codes (zero-knowledge no admite rescate).',
 ARRAY['lesson', 'recovery', 'doctrine'],
 'operator_luis')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------
-- PROJECTS — los 34 repos reales (cross-checked GitHub + Vercel)
-- -----------------------------------------------------------
INSERT INTO projects (id, name, description, github_repo, github_private, github_language, github_url, vercel_url, status, category) VALUES

-- Categoría A: Proyectos vivos
('vforge', 'vForge', 'Esta app — fábrica de aplicaciones',
 'turbillon50/vforge', false, 'TypeScript', 'https://github.com/turbillon50/vforge', 'https://vforge.site', 'live', 'produccion'),
('vandefi', 'VanDeFi', 'Non-custodial DeFi neobank',
 'turbillon50/vandefi', true, 'JavaScript', 'https://github.com/turbillon50/vandefi', 'https://vandefi.bandefi.org', 'live', 'produccion'),
('castores', 'Castores Control', 'BITACORA DE OBRA FINAL — gestión construcción',
 'turbillon50/FINAL-CASTORES', false, 'TypeScript', 'https://github.com/turbillon50/FINAL-CASTORES', 'https://castores.info', 'live', 'produccion'),
('rivones', 'Rivones / Autospot', 'Renta de autos',
 'turbillon50/rivones', false, 'TypeScript', 'https://github.com/turbillon50/rivones', 'https://autospot.mx', 'error', 'en_revision'),
('jobber', 'Jobber Logística', 'Logística dinámica de paquetería',
 'turbillon50/jobber-', true, 'TypeScript', 'https://github.com/turbillon50/jobber-', 'https://jobber.allglobal.ec', 'live', 'produccion'),
('vmomentum', 'V-Momentum HQ', 'App factory para proyectos cliente',
 'turbillon50/v-momentum-pwa', false, 'TypeScript', 'https://github.com/turbillon50/v-momentum-pwa', 'https://momentum.allglobal.ec', 'live', 'produccion'),
('vmomentum_backend', 'V-Momentum Backend', 'Backend service para V-Momentum',
 'turbillon50/v-momentum-backend', false, NULL, 'https://github.com/turbillon50/v-momentum-backend', NULL, 'unknown', 'activo'),
('agh_landing', 'AGH Landing institucional',
 'Landscape institucional de All Global Holding',
 'turbillon50/agh', true, 'TypeScript', 'https://github.com/turbillon50/agh', NULL, 'unknown', 'activo'),
('all_global_holding', 'All Global Holding LLC site', 'Sitio principal corporativo',
 'turbillon50/all-global-holding-llc', false, 'JavaScript', 'https://github.com/turbillon50/all-global-holding-llc', NULL, 'unknown', 'activo'),
('all_global_os', 'All Global OS', 'OS platform para AGH',
 'turbillon50/all-global-os', true, 'TypeScript', 'https://github.com/turbillon50/all-global-os', NULL, 'unknown', 'activo'),
('vtan_trading', 'V-Tan / Tanit Trading', 'Trading platform',
 'turbillon50/v-tan', true, 'TypeScript', 'https://github.com/turbillon50/v-tan', NULL, 'unknown', 'activo'),
('tanit_frontend', 'Tanit Frontend', 'Frontend de la app Tanit Trading',
 'turbillon50/tanit-fronted', false, 'TypeScript', 'https://github.com/turbillon50/tanit-fronted', NULL, 'unknown', 'activo'),

-- Categoría B: Repos sin deploy claro o en construcción
('vproperty', 'V-Property', 'Concepto en construcción',
 'turbillon50/v-property', true, NULL, 'https://github.com/turbillon50/v-property', NULL, 'unknown', 'en_revision'),
('vliving', 'V-Living', 'Fractional living',
 'turbillon50/v-living', false, 'TypeScript', 'https://github.com/turbillon50/v-living', NULL, 'unknown', 'en_revision'),
('luspa', 'Lu Spa', 'Spa boutique',
 'turbillon50/lu-spa', false, 'TypeScript', 'https://github.com/turbillon50/lu-spa', NULL, 'unknown', 'en_revision'),
('hapicredit', 'HapiCredit', 'Aplicación para créditos',
 'turbillon50/hapicredit', false, 'TypeScript', 'https://github.com/turbillon50/hapicredit', NULL, 'unknown', 'en_revision'),
('sagrada_comunidad', 'Sagrada Comunidad', 'Comunidad sagrada',
 'turbillon50/sagrada-comunidad', false, 'TypeScript', 'https://github.com/turbillon50/sagrada-comunidad', NULL, 'unknown', 'en_revision'),
('esteticar', 'Esteticar', 'Lavado de autos',
 'turbillon50/esteticar', false, 'TypeScript', 'https://github.com/turbillon50/esteticar', NULL, 'unknown', 'en_revision'),
('field_service', 'Field Service Platform', 'Plataforma servicio en campo',
 'turbillon50/field-service-platform', true, 'TypeScript', 'https://github.com/turbillon50/field-service-platform', NULL, 'unknown', 'en_revision'),
('rideme', 'RideMe', 'Plataforma de transportación',
 'turbillon50/RideMe', false, 'TypeScript', 'https://github.com/turbillon50/RideMe', NULL, 'unknown', 'en_revision'),
('ride_me_alt', 'ride-me (duplicado)', 'Duplicado de RideMe — candidato a consolidar',
 'turbillon50/ride-me', false, 'JavaScript', 'https://github.com/turbillon50/ride-me', NULL, 'unknown', 'en_pausa'),
('premium_ride_share', 'Premium Ride Share Screen', 'UI para ride share',
 'turbillon50/premium-ride-share-screen', false, 'TypeScript', 'https://github.com/turbillon50/premium-ride-share-screen', NULL, 'unknown', 'en_revision'),
('vpay', 'VPAY', 'Pasarela de pagos',
 'turbillon50/VPAY', false, 'JavaScript', 'https://github.com/turbillon50/VPAY', NULL, 'unknown', 'en_revision'),
('ticket', 'Ticket', 'Sistema de tickets',
 'turbillon50/ticket', false, 'TypeScript', 'https://github.com/turbillon50/ticket', NULL, 'unknown', 'en_revision'),
('moneymaker', 'MoneyMaker', 'Generador de ingresos',
 'turbillon50/moneymaker', false, NULL, 'https://github.com/turbillon50/moneymaker', NULL, 'unknown', 'en_revision'),
('nasbot', 'NasBot', 'Nasdaq trading bot',
 'turbillon50/nasbot', true, NULL, 'https://github.com/turbillon50/nasbot', NULL, 'unknown', 'en_revision'),
('bybit_proxy', 'Bybit Proxy', 'Proxy server para Bybit API',
 'turbillon50/bybit-proxy', false, 'JavaScript', 'https://github.com/turbillon50/bybit-proxy', NULL, 'unknown', 'en_revision'),
('global_holdings_nexus', 'Global Holdings Nexus', 'Nuevo proyecto privado',
 'turbillon50/global-holdings-nexus', true, 'TypeScript', 'https://github.com/turbillon50/global-holdings-nexus', NULL, 'unknown', 'en_revision'),
('fractal_ai', 'Fractal.Ai', 'Ecosistema modular IA — descentralización',
 'turbillon50/Fractal.Ai', false, 'JavaScript', 'https://github.com/turbillon50/Fractal.Ai', NULL, 'unknown', 'en_revision'),
('fractal_legacy', 'Fractal (legacy)', 'New fiat for digital — proyecto antiguo',
 'turbillon50/Fractal', false, 'JavaScript', 'https://github.com/turbillon50/Fractal', NULL, 'unknown', 'archivo'),

-- Auxiliares / scaffolds
('vforge_v0', 'vForge v0 source', 'Snapshot del export inicial de v0.dev — referencia histórica',
 'turbillon50/vforge-v0', false, 'TypeScript', 'https://github.com/turbillon50/vforge-v0', NULL, 'unknown', 'archivo'),
('castores_final_dup', 'castores-final (duplicado)', 'Duplicado de FINAL-CASTORES — candidato a borrar',
 'turbillon50/castores-final', false, NULL, 'https://github.com/turbillon50/castores-final', NULL, 'unknown', 'pendiente_borrado'),
('final_allglobal_dup', 'final-allglobal', 'Variante del sitio AGH',
 'turbillon50/final-allglobal', false, 'HTML', 'https://github.com/turbillon50/final-allglobal', NULL, 'unknown', 'en_pausa'),
('next_video_starter', 'Next Video Starter', 'Template privado',
 'turbillon50/next-video-starter', true, 'CSS', 'https://github.com/turbillon50/next-video-starter', NULL, 'unknown', 'archivo')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  github_repo = EXCLUDED.github_repo,
  github_private = EXCLUDED.github_private,
  github_language = EXCLUDED.github_language,
  github_url = EXCLUDED.github_url,
  vercel_url = EXCLUDED.vercel_url,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  updated_at = now();

-- Mark this seed as applied
INSERT INTO schema_migrations (version) VALUES ('002_seed') ON CONFLICT DO NOTHING;
