-- Personal workspace identity is independent of global platform ownership.
CREATE TABLE IF NOT EXISTS vforge_personal_spaces (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_-]{0,63}$'),
  name text NOT NULL,
  owner_clerk_user_id text NOT NULL UNIQUE,
  owner_email text NOT NULL UNIQUE,
  assistant_name text NOT NULL,
  infra_house text CHECK (infra_house IN ('luis', 'acevedo')),
  memory_provider text,
  memory_status text NOT NULL DEFAULT 'pending' CHECK (memory_status IN ('pending','connected','error')),
  memory_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
