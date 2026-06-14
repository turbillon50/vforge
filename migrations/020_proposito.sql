-- 020_proposito.sql — Módulo PROPOSITO (entendimiento de negocio + diagnóstico). ADITIVO.
CREATE TABLE IF NOT EXISTS project_proposito (
  project_id     text PRIMARY KEY,
  summary        text,   -- qué es el negocio
  audience       text,   -- a quién sirve
  problem        text,   -- qué problema resuelve
  revenue_model  text,   -- cómo gana dinero
  business_model text,   -- su modelo
  north_star     text,   -- su norte / objetivo
  value_prop     text,   -- para qué existe / propuesta de valor
  needs          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- capacidades requeridas (override)
  declared_stack jsonb NOT NULL DEFAULT '{}'::jsonb,   -- stack real declarado (Brain)
  updated_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
