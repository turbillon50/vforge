/**
 * Auto-healing database schema initialization.
 * Runs silently on first request to ensure all required tables and columns exist.
 * Does not throw errors - fails gracefully if schema is already correct.
 */

import { sql } from "./client";

let _healed = false;

async function ensureSkillsTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS skills (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        system_prompt text NOT NULL DEFAULT ''
      )
    `;
  } catch {
    // Table already exists, ignore
  }
}

async function ensureSkillsColumns(): Promise<void> {
  const columns: Array<[string, string]> = [
    ["required_tools", "text[] DEFAULT '{}'"],
    ["ring_max", "int DEFAULT 1"],
    ["source", "text NOT NULL DEFAULT 'user'"],
    ["tags", "text[] DEFAULT '{}'"],
    ["active", "boolean DEFAULT true"],
    ["installed_at", "timestamptz"],
    ["created_by", "text"],
    ["created_at", "timestamptz NOT NULL DEFAULT now()"],
    ["updated_at", "timestamptz NOT NULL DEFAULT now()"],
  ];

  for (const [col, def] of columns) {
    try {
      await sql.query(`ALTER TABLE skills ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    } catch {
      // Column already exists, ignore
    }
  }
}

async function ensureSkillsIndexes(): Promise<void> {
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_source ON skills (source)`;
  } catch {
    // Index already exists, ignore
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING gin (tags)`;
  } catch {
    // Index already exists, ignore
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;
  } catch {
    // Index already exists, ignore
  }
}

async function ensureSeedSkills(): Promise<void> {
  try {
    await sql`
      INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at) VALUES
        (
          'new-project-bootstrap',
          'New Project Bootstrap',
          'Create new projects with complete structure and auto-deployment',
          E'When asked to create a new project:\n1. Ask for name, description, type\n2. Create GitHub repo with template\n3. Configure Vercel project\n4. Register domain if needed\n5. Verify deployment works',
          ARRAY['github', 'vercel', 'deploy', 'scaffold'],
          'system',
          ARRAY['github_create_repo', 'github_write_file'],
          now()
        ),
        (
          'repo-rescue',
          'Repo Rescue',
          'Diagnose and repair projects with build or deploy errors',
          E'When a project has errors:\n1. Check Vercel logs\n2. Read config files\n3. Identify broken deps or config\n4. Propose fix and request confirmation\n5. Verify build passes',
          ARRAY['github', 'vercel', 'debug', 'fix'],
          'system',
          ARRAY['github_read_file', 'github_write_file'],
          now()
        ),
        (
          'repo-categorizer',
          'Repo Categorizer',
          'Audit and categorize repositories by activity and health',
          E'To categorize repos:\n1. Check commits from last 30 days\n2. Verify active deployment\n3. Review structure and quality\n4. Assign score 0-100\n5. Save audit results',
          ARRAY['github', 'audit', 'organize'],
          'system',
          ARRAY['github_read_file'],
          NULL
        ),
        (
          'dns-manager',
          'DNS Manager',
          'Manage domains and DNS via Name.com',
          E'For DNS operations:\n1. Verify domain availability\n2. Configure nameservers\n3. Add/modify DNS records\n4. Verify propagation',
          ARRAY['dns', 'domain', 'namecom'],
          'system',
          ARRAY['namecom_check_domain'],
          NULL
        )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        system_prompt = EXCLUDED.system_prompt,
        tags = EXCLUDED.tags,
        required_tools = EXCLUDED.required_tools,
        updated_at = now()
    `;
  } catch {
    // Skills already exist or insert failed, ignore
  }
}

async function ensureOtherTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agent_directives (
        id        text PRIMARY KEY,
        kind      text NOT NULL,
        title     text NOT NULL,
        content   text NOT NULL,
        locked    boolean DEFAULT false,
        priority  int DEFAULT 100,
        active    boolean DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vforge_workspaces (
        id text PRIMARY KEY,
        name text NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vforge_threads (
        id text PRIMARY KEY,
        workspace_id text,
        title text NOT NULL,
        messages jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vault_operator_secrets (
        id       text PRIMARY KEY,
        name     text NOT NULL UNIQUE,
        value    text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vault_project_secrets (
        id         text PRIMARY KEY,
        project_id text NOT NULL,
        name       text NOT NULL,
        value      text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(project_id, name)
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }
}

async function ensureSemanticMemory(): Promise<void> {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  } catch {
    // Extension might not be available
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id text PRIMARY KEY,
        content text NOT NULL,
        embedding vector(1536),
        category text NOT NULL,
        metadata jsonb DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_semantic_memory_category
      ON semantic_memory (category)
    `;
  } catch {
    // Index already exists
  }
}


type SeedClient = [string, string, string, number, number, string];

const SEED_CARTERA: SeedClient[] = [
  ["apsus", "APSUS (apsus.live)", "arranque", 12000, 0, "Infra completa — $4,000 el lunes"],
  ["csn-carnes", "CSN Carnes (carnesn.ink)", "entrega — casi listo", 12000, 4500, "Contenido dinamico + comentarios cliente"],
  ["decaciones", "Decaciones (decaciones.info)", "en obra", 12000, 4000, "Cover Flow + flujo Spotify"],
  ["happytoc", "Happytoc (happytoc.life)", "roto: recuperar frontend", 12000, 4000, "Recuperar frontend original + logica actual"],
  ["istore", "iStore (i-store.shop)", "arranque", 12000, 4000, "Infra completa desde cero"],
  ["mt-empresarial", "MT Empresarial (mtempresarial.life)", "en obra", 12000, 4000, "Panel administrador completo"],
  ["yerro-fiscal", "Yerro Fiscal (yerro.ink)", "en obra", 12000, 0, "Explotar features + panel admin"],
  ["arco-covagps", "Pedro Cova GPS (arco.buzz)", "urgente: codigo perdido", 5000, 3000, "Reconstruir desde cero (ref TrackPoint)"],
  ["castores-bitacora", "Castores Bitacora (castores.info)", "liquidado", 5000, 5000, "Fix QR + pase lista supervisor + nominas"],
  ["castores-tienda", "Castores Tienda (castores.live)", "entrega — muy avanzada", 3500, 1500, "Seguimiento hasta cierre"],
  ["crede-ti", "Crede-Ti (crede-ti.info)", "urgente: verificar entrega", 6000, 6000, "Flujo solicitud-aprobacion + VAPID"],
  ["el-juego", "El Juego de la Inteligencia", "en obra", 12000, 9000, "Rediseno visual + 2 mascotas LLM"],
  ["hakapoke", "Hakapoke (hakapoke.ink)", "terminado — cobrar", 5000, 3750, "Integrar Stripe + handoff"],
  ["lnred", "LN RED (lnred.ink)", "entregado — cobrar", 9000, 6000, "Conectar Mercado Pago para pruebas"],
  ["rideme", "RideMe (rideme.ink) — socio", "en obra", 3000, 3000, "Panel admin + Google Maps + servidor"],
  ["ruta618", "Ruta 618 (ruta618.life)", "en obra", 9000, 1500, "Cierre con cliente (VAPID listo)"],
  ["tortillap", "Tortillap (tortillap.info)", "arranque", 5000, 2500, "Avance visible para cobrar + admin + VAPID"],
];

async function ensureClientPortfolio(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS client_project_status (
        project_id     text PRIMARY KEY,
        client_name    text NOT NULL,
        status         text NOT NULL DEFAULT 'en obra',
        total_mxn      numeric NOT NULL DEFAULT 0,
        paid_mxn       numeric NOT NULL DEFAULT 0,
        next_milestone text,
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS v_project_activity (
        id         bigserial PRIMARY KEY,
        project_id text NOT NULL,
        title      text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_v_project_activity_project
      ON v_project_activity (project_id, created_at DESC)
    `;
  } catch {
    // Table already exists
  }

  // Seed inicial desde el mapa de proyectos (jun 2026). ON CONFLICT DO NOTHING:
  // las ediciones posteriores de Luis SIEMPRE ganan sobre el seed.
  for (const [id, name, status, total, paid, milestone] of SEED_CARTERA) {
    try {
      await sql`
        INSERT INTO client_project_status
          (project_id, client_name, status, total_mxn, paid_mxn, next_milestone)
        VALUES (${id}, ${name}, ${status}, ${total}, ${paid}, ${milestone})
        ON CONFLICT (project_id) DO NOTHING
      `;
    } catch {
      // Seed row failed, ignore
    }
  }
}

/**
 * MCP RBAC + multi-tenant isolation columns. org_id is the tenant key on the
 * tables read by the MCP data tools. NULL = operator-only (admin sees it,
 * clients never do). Idempotent. See migration 012_mcp_rbac.sql.
 */
async function ensureMcpRbac(): Promise<void> {
  const alters = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id text",
    "ALTER TABLE client_project_status ADD COLUMN IF NOT EXISTS org_id text",
  ];
  for (const a of alters) {
    try {
      await sql.query(a);
    } catch {
      // table may not exist yet in some envs, or column already present
    }
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (org_id)`;
  } catch {
    /* ignore */
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_client_project_status_org ON client_project_status (org_id)`;
  } catch {
    /* ignore */
  }
}

/**
 * ACCESO DE DUEÑO (operator). El token MCP portátil de Luis debe verlo TODO:
 * sus 64 proyectos (incluidos los de org_id NULL), client_project_status y el
 * brain completo — desde CUALQUIER cliente MCP, porque la identidad la define
 * el token, no la cuenta de Claude. La columna mcp_tokens.scope acepta dos
 * sinónimos para el dueño: 'admin' (histórico) y 'operator' (canónico); el
 * resolver (lib/mcp/tokens.ts) los trata idénticos = ven todo, sin filtro de
 * tenant. El aislamiento de los tokens 'client' (sólo su org_id) NO se toca.
 *
 * Esto repara el caso real: el token del dueño quedó marcado 'client' (su
 * lookup de owner falló al crearse), así que Luis no veía nada cross-tenant.
 * Aquí se ancla, idempotente, en cada arranque. El hash es SHA-256 (no es el
 * secreto) y puede sobre-escribirse por env VFORGE_OPERATOR_MCP_TOKEN_HASH.
 */
const OPERATOR_MCP_TOKEN_HASH =
  process.env.VFORGE_OPERATOR_MCP_TOKEN_HASH ??
  "085a824168d92736671850480a1ce48fd2b0b3b71cfa993fa10d77c462c51794";

async function ensureOperatorScope(): Promise<void> {
  // 1) La columna scope debe admitir 'operator' además de admin/client/public.
  try {
    await sql`ALTER TABLE mcp_tokens DROP CONSTRAINT IF EXISTS mcp_tokens_scope_chk`;
    await sql`
      ALTER TABLE mcp_tokens
        ADD CONSTRAINT mcp_tokens_scope_chk
        CHECK (scope IN ('admin', 'operator', 'client', 'public'))
    `;
  } catch {
    // legacy rows pueden impedir el constraint; el código lo normaliza igual
  }
  // 2) Anclar el token del dueño como operator (ve TODO, sin filtro de tenant).
  try {
    await sql.query(
      `UPDATE mcp_tokens
         SET scope = 'operator', org_id = NULL
       WHERE token_hash = $1 AND scope IS DISTINCT FROM 'operator'`,
      [OPERATOR_MCP_TOKEN_HASH],
    );
  } catch {
    // tabla aún no existe en algún env, o ya está anclado
  }
}

/**
 * CONTRATOS + PORTAL DEL CLIENTE (jun 2026). Tablas que sostienen:
 *  - contracts: un contrato por proyecto, con estado de firma DocuSign.
 *  - contract_payments: el esquema de 3 pagos de V-Momentum (40/40/20 default).
 *  - project_feedback: comentarios y sugerencias del cliente desde su portal.
 * Además extiende evidence_vault.kind para aceptar fotos/archivos subidos por
 * el cliente desde su celular. Idempotente. Ver migración 018.
 */
async function ensureContractsPortal(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS contracts (
        id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id          text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        client_name         text NOT NULL,
        product             text NOT NULL,
        amount_mxn          numeric NOT NULL DEFAULT 0,
        currency            text NOT NULL DEFAULT 'MXN',
        status              text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','signed','declined','voided')),
        signer_name         text,
        signer_email        text,
        docusign_envelope_id text,
        pdf_url             text,
        sent_at             timestamptz,
        signed_at           timestamptz,
        created_by          text,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    /* table exists */
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts (project_id)`;
  } catch {
    /* ignore */
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_contracts_envelope ON contracts (docusign_envelope_id) WHERE docusign_envelope_id IS NOT NULL`;
  } catch {
    /* ignore */
  }
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS contract_payments (
        id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        contract_id text NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        idx         int  NOT NULL,
        label       text NOT NULL,
        amount_mxn  numeric NOT NULL DEFAULT 0,
        status      text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid')),
        paid_at     timestamptz,
        UNIQUE (contract_id, idx)
      )
    `;
  } catch {
    /* table exists */
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_contract_payments_contract ON contract_payments (contract_id, idx)`;
  } catch {
    /* ignore */
  }
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS project_feedback (
        id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id   text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        author_email text NOT NULL,
        author_name  text,
        kind         text NOT NULL DEFAULT 'comment'
                     CHECK (kind IN ('comment','suggestion')),
        body         text NOT NULL,
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    /* table exists */
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_project_feedback_project ON project_feedback (project_id, created_at DESC)`;
  } catch {
    /* ignore */
  }
  // El cliente sube fotos y archivos desde su celular: ampliar el CHECK de kind.
  try {
    await sql`ALTER TABLE evidence_vault DROP CONSTRAINT IF EXISTS evidence_vault_kind_check`;
    await sql`
      ALTER TABLE evidence_vault
        ADD CONSTRAINT evidence_vault_kind_check
        CHECK (kind IN ('screenshot','text','voice','photo','file'))
    `;
  } catch {
    /* legacy rows o constraint ya correcto */
  }
}

/**
 * CHAT PERSISTENTE DE V (jun 2026). El chat de la página /v ("V, Agente
 * Central") debe guardar CADA conversación de Luis para no perderla al recargar
 * y poder retomarla entre sesiones. Dos tablas dedicadas (ver lib/v-chat/store).
 * Idempotente. El store también las auto-cura en su primer uso.
 */
async function ensureVChat(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS v_chat_sessions (
        id         text PRIMARY KEY,
        user_id    text NOT NULL,
        titulo     text,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS v_chat_messages (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    text NOT NULL,
        session_id text NOT NULL,
        role       text NOT NULL CHECK (role IN ('user','assistant')),
        content    text NOT NULL,
        model      text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_v_chat_messages_session ON v_chat_messages (session_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_v_chat_sessions_user ON v_chat_sessions (user_id, last_at DESC)`;
  } catch {
    // Tablas ya existen o el heal corre luego; el store las asegura igual.
  }
}

/**
 * Heal the database schema. Runs once per process.
 * Call this from api routes or middleware that execute early.
 */
export async function healDatabase(): Promise<void> {
  if (_healed) return;
  _healed = true;

  try {
    await ensureSkillsTable();
    await ensureSkillsColumns();
    await ensureSkillsIndexes();
    await ensureSeedSkills();
    await ensureOtherTables();
    await ensureSemanticMemory();
    await ensureClientPortfolio();
    await ensureMcpRbac();
    await ensureOperatorScope();
    await ensureContractsPortal();
    await ensureVChat();
  } catch (e) {
    // Silently fail - don't crash the app if database healing fails
    console.error("[V auto-heal] Database healing failed:", e);
  }
}
