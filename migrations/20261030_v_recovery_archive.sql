CREATE TABLE IF NOT EXISTS v_recovery_archive (
 id text PRIMARY KEY,
 source_table text NOT NULL,
 original_id text NOT NULL,
 source_time timestamptz,
 author text,
 title text NOT NULL,
 content text NOT NULL,
 original_sha256 text NOT NULL,
 redacted boolean NOT NULL,
 source_files jsonb NOT NULL,
 recovered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v_recovery_archive_search_idx ON v_recovery_archive USING gin(to_tsvector('spanish',title||' '||content));
