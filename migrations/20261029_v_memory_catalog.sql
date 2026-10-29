-- Additive index: never changes conversations, identity or existing embeddings.
CREATE TABLE IF NOT EXISTS v_memory_documents (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_time timestamptz,
  author text,
  title text,
  content text NOT NULL,
  original_sha256 text NOT NULL,
  redacted boolean NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  indexed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v_memory_documents_owner ON v_memory_documents(owner_id,source_type,source_id);
CREATE TABLE IF NOT EXISTS v_memory_chunks (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  model_digest text NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  embedded_at timestamptz
);
CREATE INDEX IF NOT EXISTS v_memory_chunks_pending ON v_memory_chunks(owner_id,model_digest) WHERE embedding IS NULL;
CREATE TABLE IF NOT EXISTS v_memory_document_chunks (
  document_id text NOT NULL REFERENCES v_memory_documents(id),
  chunk_id text NOT NULL REFERENCES v_memory_chunks(id),
  position integer NOT NULL,
  start_offset integer NOT NULL,
  end_offset integer NOT NULL,
  PRIMARY KEY(document_id,position)
);
CREATE INDEX IF NOT EXISTS v_memory_links_chunk ON v_memory_document_chunks(chunk_id);
CREATE TABLE IF NOT EXISTS v_memory_ingestion_runs (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  manifest jsonb NOT NULL DEFAULT '{}'
);
