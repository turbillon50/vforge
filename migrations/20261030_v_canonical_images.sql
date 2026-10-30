-- Owner-only canonical chat photo attachments. Image bytes are AES-256-GCM encrypted.
CREATE TABLE IF NOT EXISTS v_canonical_images (
 id text PRIMARY KEY, session_id text NOT NULL, message_id text NOT NULL,
 name text NOT NULL, width integer NOT NULL, height integer NOT NULL,
 payload jsonb NOT NULL, description text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v_canonical_images_session_idx ON v_canonical_images(session_id);
