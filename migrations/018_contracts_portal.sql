-- -----------------------------------------------------------
-- Migration 018 — Contratos + Portal del Cliente
--
-- contracts            : un contrato por proyecto, con su estado de firma
--                        DocuSign (draft → sent → signed).
-- contract_payments    : el esquema de pagos de V-Momentum (3 parcialidades).
-- project_feedback     : comentarios y sugerencias que el cliente deja desde
--                        su portal (/workspace/proyecto/[id]).
-- evidence_vault.kind  : se amplía para aceptar 'photo' y 'file' — el cliente
--                        sube fotos y evidencias desde su celular (Vercel Blob).
--
-- Refleja exactamente lib/db/auto-heal.ts → ensureContractsPortal(), que es
-- el mecanismo que garantiza el schema en producción (auto-healing). Esta
-- migración existe como registro versionado.
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS contracts (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id           text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_name          text NOT NULL,
  product              text NOT NULL,
  amount_mxn           numeric NOT NULL DEFAULT 0,
  currency             text NOT NULL DEFAULT 'MXN',
  status               text NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','sent','signed','declined','voided')),
  signer_name          text,
  signer_email         text,
  docusign_envelope_id text,
  pdf_url              text,
  sent_at              timestamptz,
  signed_at            timestamptz,
  created_by           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contracts_project  ON contracts (project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_envelope ON contracts (docusign_envelope_id)
  WHERE docusign_envelope_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contract_payments (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contract_id text NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  idx         int  NOT NULL,
  label       text NOT NULL,
  amount_mxn  numeric NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at     timestamptz,
  UNIQUE (contract_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_contract_payments_contract
  ON contract_payments (contract_id, idx);

CREATE TABLE IF NOT EXISTS project_feedback (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id   text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_email text NOT NULL,
  author_name  text,
  kind         text NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment','suggestion')),
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_feedback_project
  ON project_feedback (project_id, created_at DESC);

ALTER TABLE evidence_vault DROP CONSTRAINT IF EXISTS evidence_vault_kind_check;
ALTER TABLE evidence_vault
  ADD CONSTRAINT evidence_vault_kind_check
  CHECK (kind IN ('screenshot','text','voice','photo','file'));

INSERT INTO schema_migrations (version) VALUES ('018_contracts_portal')
  ON CONFLICT (version) DO NOTHING;
