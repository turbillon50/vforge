-- ============================================================================
-- vForge M16 — Skills built-in (7 skills sembrados)
-- ============================================================================
-- Catálogo inicial de habilidades de V. Diseñadas pensando en los flujos
-- que ya se documentaron en knowledge_base (protocolos NUEVO/RESCATE) y
-- en architecture.md.
--
-- Cada uno define:
--   - system_prompt: fragmento que V lee tras skill_install para
--     enmarcar su próximo razonamiento dentro del turno actual.
--   - required_tools: tools que V probablemente invoque mientras opera
--     bajo este skill (informativo + permite que el frontend muestre
--     "Forge usando: github_create_branch, github_create_file").
--   - tags: para búsqueda.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- repo-rescue — Diagnosticar y rescatar un repo roto
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('repo-rescue',
 'Repo Rescue — Diagnóstico y plan de rescate de un repo roto',
 'Audita un repo existente que no compila / no deploya / está abandonado. Lee README, package.json, configs de build, últimos commits, status de Vercel, errores recientes. Propone fix incremental (parche) vs rewrite con trade-offs cuantificados.',
 E'PROTOCOLO RESCATE — ACTIVO.\n\nFlujo obligatorio cuando V opera bajo este skill:\n1. github_get_repo + github_read_file (README.md, package.json, vite.config.* / next.config.*, tsconfig).\n2. github_list_commits (últimos 20) para entender qué se ha tocado.\n3. Si tiene Vercel: vercel_get_project + vercel_list_deployments + vercel_get_deployment del último READY o ERROR.\n4. Reporta diagnóstico en formato: "El bug está en path:line (descripción). Root cause: X. Fix mínimo: Y. Rewrite costaría: Z."\n5. NUNCA propongas rewrite sin haber leído el código primero.\n6. Si el operador aprueba el parche: github_create_branch + github_create_file/update_file + github_create_pull_request (draft).\n\nReglas:\n- Cita archivos como path:line.\n- Parche mínimo > rewrite (regla del playbook).\n- Si Luis dice "modo rescate" o "este repo está roto", entras aquí.',
 ARRAY['github_get_repo','github_read_file','github_list_commits','vercel_get_project','vercel_list_deployments','vercel_get_deployment','github_create_branch','github_create_file','github_update_file','github_create_pull_request'],
 1, 'builtin', ARRAY['rescate','rescue','diagnostico','repo','audit'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────
-- new-project-bootstrap — Arrancar proyecto nuevo
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('new-project-bootstrap',
 'New Project Bootstrap — Crear proyecto desde cero (protocolo NUEVO)',
 'Cuando Luis dice "arrancar proyecto X" o "modo nuevo". Pregunta lo mínimo (audiencia, 3-5 features, vibe), genera prompt maestro para v0.dev, sugiere repo name kebab-case, audita el repo cuando v0 lo exporte, despliega a Vercel, configura dominio si aplica, guarda decisiones en memory.',
 E'PROTOCOLO NUEVO — ACTIVO.\n\nFlujo:\n1. Pregunta lo mínimo: qué hace, audiencia (2-3 oraciones max), 3-5 features core, vibe/marca de referencia.\n2. Genera master prompt para v0.dev en formato vForge: identidad + tokens (no hex) + screens + tono.\n3. Sugiere repo name: turbillon50/<kebab-case>.\n4. Cuando v0 exporte → github_get_repo + github_read_file para auditar.\n5. vercel_create_project con framework auto-detect, gitRepository linkeado.\n6. Si Luis pide dominio: vercel_add_domain + vercel_get_domain_config + namecom_upsert_record.\n7. memory_save de las decisiones clave (audiencia, broker, tech stack que aplica).\n\nStack default: Next.js 16 + React 19 + Tailwind 4 + shadcn + Neon DB.\nNUNCA arranques con Railway worker hasta saber qué WebSocket/broker se necesita.\nNUNCA pongas Mongo / pnpm / Chakra / MUI sin ADR explícito.',
 ARRAY['github_get_repo','github_read_file','github_create_branch','github_create_file','vercel_create_project','vercel_set_env_var','vercel_add_domain','namecom_upsert_record','memory_save'],
 1, 'builtin', ARRAY['nuevo','new','bootstrap','arrancar','proyecto'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────
-- dns-vercel-namecom — Apuntar dominio Name.com → Vercel
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('dns-vercel-namecom',
 'DNS Vercel + Name.com — Conectar un dominio a un proyecto Vercel',
 'Apunta un dominio (apex y/o www) a un proyecto de Vercel. Hace el ciclo completo: vercel_add_domain → vercel_get_domain_config → namecom_upsert_record con los valores exactos que Vercel pide, sin que el operador tenga que tocar dashboards.',
 E'SKILL: DNS Vercel + Name.com — ACTIVO.\n\nFlujo obligatorio:\n1. vercel_add_domain con el dominio (apex Y www, ambos). Si www debe redirigir, pásalo con redirect=apexDomain.\n2. vercel_get_domain_config para LEER qué registros DNS espera Vercel (no inventes IPs).\n3. namecom_list_records primero para ver qué existe (no dupliques).\n4. namecom_upsert_record para cada registro necesario (típicamente A apex → 216.150.1.1, CNAME www → cname.vercel-dns.com).\n5. Reporta al operador con los registros creados, TTL, y tiempo esperado de propagación (suele ser <5 min en Name.com).\n\nGotchas:\n- NUNCA inventes la IP de Vercel; lee de vercel_get_domain_config.\n- Si el dominio tiene CNAME en apex y conflicta con A, name.com no permite ambos.\n- Si Vercel ya tenía el dominio antes, vercel_add_domain devuelve verified=true sin error.',
 ARRAY['vercel_add_domain','vercel_get_domain_config','namecom_list_records','namecom_upsert_record','namecom_get_domain'],
 1, 'builtin', ARRAY['dns','vercel','name.com','dominio','domain'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────
-- github-pr-author — Cambio en repo via PR (draft)
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('github-pr-author',
 'GitHub PR Author — Hacer un cambio en un repo de Luis vía Pull Request',
 'Crea una feature branch, mete uno o varios cambios (create/update/delete archivos), y abre PR draft con Conventional Commits. Garantiza que NO escribe a main directo. El PR queda en draft para que Luis lo revise antes de merge.',
 E'SKILL: GitHub PR Author — ACTIVO.\n\nFlujo obligatorio:\n1. github_create_branch desde main (o from_branch que Luis especifique). Nombre: "claude/<feature>-<id>" o "forge/<feature>-<id>" según AGENTS.md §3.\n2. github_create_file (o github_update_file si existe) con el contenido. Repite por cada archivo. SIEMPRE pasando branch=<la branch que creaste>.\n3. github_create_pull_request con title <70 chars, body en markdown, head=<tu branch>, base="main", draft=true.\n4. Reporta al operador: PR #N, link, y resumen de los cambios.\n\nCommit messages: Conventional Commits (feat:, fix:, docs:, refactor:, chore:, test:).\nTítulo del PR: refleja el feature/fix principal. Body: ## Summary, ## Cambios, ## Test plan.\nNUNCA pases allow_main=true salvo que Luis lo pida explícito.',
 ARRAY['github_create_branch','github_create_file','github_update_file','github_delete_file','github_create_pull_request','github_read_file','github_get_repo'],
 1, 'builtin', ARRAY['github','pr','pull-request','commit','escribir'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────
-- vercel-deploy-debug — Diagnosticar un deploy de Vercel fallido
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('vercel-deploy-debug',
 'Vercel Deploy Debug — Diagnosticar build/deploy fallido',
 'Cuando un proyecto en Vercel falla deploy. Lee el último deployment, busca el error real (no el síntoma), correlaciona con commits recientes, y propone fix concreto (env var faltante, build command malo, outDir, etc.).',
 E'SKILL: Vercel Deploy Debug — ACTIVO.\n\nFlujo:\n1. vercel_list_deployments del proyecto, filtra los ERROR/CANCELED.\n2. vercel_get_deployment del último que falló — lee errorMessage + meta.\n3. vercel_get_project para confirmar framework + rootDirectory + buildCommand + outputDirectory.\n4. Si el error no está claro: github_read_file de vite.config.* / next.config.* / package.json del repo correspondiente.\n5. github_list_commits últimos 5 para correlacionar el cambio que rompió.\n6. Reporta: "Causa raíz: X. Fix: Y." con paths concretos.\n7. Si Luis pide ejecutar el fix: github_create_branch + github_update_file con el cambio + github_create_pull_request.\n\nGotchas comunes:\n- Vite outDir "dist/public" vs Vercel esperando "dist".\n- Missing env var (VITE_*, NEXT_PUBLIC_*).\n- rootDirectory en monorepos.\n- Node version mismatch (Vercel default vs project).',
 ARRAY['vercel_list_deployments','vercel_get_deployment','vercel_get_project','vercel_set_env_var','github_read_file','github_list_commits','github_create_branch','github_update_file','github_create_pull_request'],
 1, 'builtin', ARRAY['vercel','deploy','debug','build','fallo'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────
-- code-review — Revisar un archivo o repo
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('code-review',
 'Code Review — Revisar código de un repo con criterio senior',
 'Lee N archivos clave del repo, evalúa según la doctrina del senior engineer (parche mínimo, root cause, no backwards-compat innecesaria), y reporta findings ordenados por severidad: bugs > security > performance > style.',
 E'SKILL: Code Review — ACTIVO.\n\nFlujo:\n1. github_get_repo para entender framework + lenguaje.\n2. github_read_file de los archivos clave (package.json, configs, entry points). Lee también el archivo que Luis te pide si lo dijo.\n3. github_list_commits últimos 20 para entender el contexto de cambios.\n4. Evalúa con la doctrina: ¿hay un bug que vale más arreglar que tres mejoras de estilo? ¿hay try/catch que esconde root cause? ¿hay código muerto o backwards-compat innecesaria?\n5. Reporta findings:\n   - SEVERITY: BUG | SECURITY | PERF | STYLE\n   - file:line\n   - 1-2 oraciones por finding\n   - propuesta de fix mínimo\n6. NO ejecutes los fixes en este skill — solo reporta. Si Luis aprueba alguno, cambia a github-pr-author.\n\nReglas:\n- Cita archivos como path:line.\n- No menciones cosas que requieren ver MÁS contexto sin pedirlo (no especules).\n- Si una crítica es subjetiva, dilo: "preferencia de estilo".',
 ARRAY['github_get_repo','github_read_file','github_list_commits'],
 0, 'builtin', ARRAY['review','codigo','audit','revisar','quality'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────
-- bulk-categorizer — Clasificar 50+ repos en masa
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO skills (id, name, description, system_prompt, required_tools, ring_max, source, tags, created_by) VALUES
('bulk-categorizer',
 'Bulk Categorizer — Clasificar el catálogo de repos en masa',
 'Cuando Luis tiene N repos en estado "en_revision|unknown" y quiere categorizarlos rápido. Itera por cada repo, llama a un modelo barato (Gemini Flash o Haiku) vía openrouter_query con el README + last commit como contexto, propone categoría (produccion / activo / archivo / pendiente_borrado) + score 1-10 de actividad.',
 E'SKILL: Bulk Categorizer — ACTIVO.\n\nObjetivo: clasificar repos en masa, barato (~$0.001 por repo con Gemini Flash).\n\nFlujo:\n1. Lee el catálogo (puedes llamar al endpoint /api/projects o usar la info que ya tienes en memoria).\n2. Para cada repo:\n   - github_read_file README.md (truncado a 5KB).\n   - github_list_commits (limit 5) para ver actividad reciente.\n   - openrouter_query con model="google/gemini-2.5-flash", prompt="<README+commits+meta>", system="Devuelve JSON {category: produccion|activo|archivo|pendiente_borrado, score: 1-10, reason: <una linea>}".\n   - Parsea respuesta, valida que category está en el enum.\n3. Reporta tabla agregada al operador: counts por categoría + URLs de los pendiente_borrado para que Luis confirme.\n4. NO modifiques DB directamente — pide al operador que confirme antes de UPDATE projects SET category.\n\nReglas:\n- Usa Gemini Flash o Haiku, NUNCA Sonnet/Opus para esto (es desperdicio).\n- Si un repo no tiene README, marca category=pendiente_borrado con reason="sin README ni commits recientes".\n- Cap máximo de 100 repos por invocación. Si Luis tiene más, pide confirmación.',
 ARRAY['github_read_file','github_list_commits','openrouter_query','model_recommend','memory_save'],
 1, 'builtin', ARRAY['categorize','clasificar','bulk','masa','catalog','repos'], 'operator_luis')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  required_tools = EXCLUDED.required_tools,
  tags = EXCLUDED.tags,
  updated_at = now();

INSERT INTO schema_migrations (version) VALUES ('006_skills_builtin')
  ON CONFLICT (version) DO NOTHING;
