-- 012_mercadopago_connect.sql
-- Mercado Pago Connect: los tokens del vendedor se guardan en user_secrets
-- con scope 'mercadopago'. El CHECK original (001_initial) solo permitía
-- client/platform/platform-global, así que lo ampliamos de forma idempotente
-- para aceptar los scopes por-proveedor (igual que Stripe).
DO $$
BEGIN
  ALTER TABLE user_secrets DROP CONSTRAINT IF EXISTS user_secrets_scope_check;
  ALTER TABLE user_secrets ADD CONSTRAINT user_secrets_scope_check
    CHECK (scope IN ('client','platform','platform-global','stripe','mercadopago'));
EXCEPTION WHEN others THEN
  -- si la tabla/constraint no existe en este entorno, no rompemos la migración
  NULL;
END $$;
