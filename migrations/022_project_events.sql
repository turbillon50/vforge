-- ============================================================================
-- 022_project_events.sql — SISTEMA NERVIOSO de VULCANO
-- ============================================================================
-- Cada app cliente del ecosistema (Castores, HapiCredit, V Momentum, …) le
-- reporta a V su "dolor": errores, caídas, latencia, pagos fallidos, etc.
-- vía POST /api/webhooks/project-health. Aquí viven esas señales nerviosas.
--
-- El receptor (route.ts) alerta a Luis por WhatsApp si severity>=high y sella
-- una `lesson` automática cuando el mismo error se repite 3+ veces/semana.
-- El agente /root/agents/nervous_system.py corre cada hora, detecta patrones
-- cruzados (mismo error en varios proyectos) y genera el reporte semanal.
-- Idempotente: CREATE ... IF NOT EXISTS en todo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  text NOT NULL,
  event_type  text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity    text NOT NULL DEFAULT 'low'
                CHECK (severity IN ('low','medium','high','critical')),
  -- firma estable del "dolor" (event_type + error normalizado) para contar
  -- repeticiones y deduplicar lessons automáticas.
  signature   text,
  ts          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project ON project_events (project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_type    ON project_events (event_type);
CREATE INDEX IF NOT EXISTS idx_project_events_sev     ON project_events (severity);
CREATE INDEX IF NOT EXISTS idx_project_events_ts      ON project_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_project_events_sig     ON project_events (signature);
