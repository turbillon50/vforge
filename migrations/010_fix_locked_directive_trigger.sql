-- ============================================================================
-- vForge fix: strengthen protect_locked_directives trigger
--
-- The original trigger in 009_agent_directives.sql only blocked changes to
-- content/title/locked/active. A priority-only update could silently mutate
-- a locked mantra's ordering. This migration replaces both triggers so that
-- ANY field change on a locked=true row raises an exception.
-- ============================================================================

-- Drop the old triggers first (function stays, we replace the triggers)
DROP TRIGGER IF EXISTS prevent_locked_directive_update ON agent_directives;
DROP TRIGGER IF EXISTS prevent_locked_directive_delete ON agent_directives;
DROP FUNCTION IF EXISTS protect_locked_directives();

-- ReCREATE OR REPLACE FUNCTION — now fires on ANY update to a locked row
CREATE OR REPLACE FUNCTION protect_locked_directives()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.locked = true THEN
      RAISE EXCEPTION 'Cannot delete locked directive (mantra): %', OLD.title;
    END IF;
    RETURN OLD;
  END IF;
  -- UPDATE: block if the row was locked before the change
  IF OLD.locked = true THEN
    RAISE EXCEPTION 'Cannot modify locked directive (mantra): %', OLD.title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate DELETE trigger
CREATE TRIGGER prevent_locked_directive_delete
  BEFORE DELETE ON agent_directives
  FOR EACH ROW
  EXECUTE FUNCTION protect_locked_directives();

-- Recreate UPDATE trigger — no WHEN clause so it fires for every field change
CREATE TRIGGER prevent_locked_directive_update
  BEFORE UPDATE ON agent_directives
  FOR EACH ROW
  EXECUTE FUNCTION protect_locked_directives();

INSERT INTO schema_migrations (version) VALUES ('010_fix_locked_directive_trigger')
  ON CONFLICT (version) DO NOTHING;
