#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { neon } from '@neondatabase/serverless';
import { MODEL, DIGEST, OWNER, sha, redact, redactMetadata, chunks, embed, verifyEndpoint } from './lib/v-memory-core.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const config = JSON.parse(fs.readFileSync(option('--config', '/etc/vl-secrets/v-memory.json'), 'utf8'));
const sql = neon(config.DATABASE_URL);
const repo = option('--repo', process.cwd());
const endpoints = config.EMBED_ENDPOINTS || ['http://127.0.0.1:11441', 'http://127.0.0.1:11442', 'http://127.0.0.1:11443'];
const runId = crypto.randomUUID();
const manifest = { scope: 'VForge SQL archive + Brain memory + committed VForge documents and identity history', sources: {}, model: MODEL, digest: DIGEST, dimensions: 768, errors: [] };
const log = value => console.log(JSON.stringify({ at: new Date().toISOString(), ...value }));
const git = argv => execFileSync('git', ['-C', repo, ...argv], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

async function collectSql() {
  const definitions = [
    ['conversations', "SELECT id::text,created_at::text AS at,role AS author,'Conversación' AS title,coalesce(content,'') AS content,jsonb_build_object('session_id',session_id,'model',model,'tool_name',tool_name) AS metadata FROM conversations WHERE user_id='operator_luis'"],
    ['semantic_memory', "SELECT id,created_at::text AS at,metadata->>'role' AS author,category AS title,content,metadata FROM semantic_memory WHERE user_id='operator_luis'"],
    ['v_chat_messages', "SELECT id::text,created_at::text AS at,role AS author,'Conversación V' AS title,content,jsonb_build_object('session_id',session_id,'model',model) AS metadata FROM v_chat_messages WHERE user_id='operator_luis' AND session_id NOT LIKE 'zz-%'"],
    ['v_user_memory', "SELECT id::text,updated_at::text AS at,'personal_note' AS author,key AS title,value AS content,'{}'::jsonb AS metadata FROM v_user_memory WHERE user_id='user_3Ds7ijSCrf17trEiHCY07urK7zV'"],
    ['knowledge_base', "SELECT id::text,created_at::text AS at,created_by AS author,title,content,jsonb_build_object('kind',kind,'source',source,'tags',tags) AS metadata FROM knowledge_base"],
    ['agent_directives', "SELECT id,created_at::text AS at,'VForge identity' AS author,title,content,jsonb_build_object('kind',kind,'locked',locked,'active',active,'priority',priority) AS metadata FROM agent_directives"],
    ['system_config', "SELECT id::text,updated_at::text AS at,'VForge configuration' AS author,'Personalidad persistida (registro histórico)' AS title,ai_personality AS content,jsonb_build_object('ai_name',ai_name,'ai_tagline',ai_tagline) AS metadata FROM system_config"],
    ['vulcano_relationship', "SELECT id::text,ts::text AS at,'relationship_record' AS author,title,essence AS content,jsonb_build_object('kind',kind,'tone',tone) AS metadata FROM vulcano_relationship"],
    ['vulcano_conversations', "SELECT id::text,ts::text AS at,role AS author,'Conversación histórica Vulcano' AS title,coalesce(full_text,summary) AS content,jsonb_build_object('source',source,'summary',summary,'topics',topics) AS metadata FROM vulcano_conversations"],
  ];
  const records = [];
  for (const [type, query] of definitions) {
    const rows = await sql.query(query);
    manifest.sources[type] = { records: rows.length, chars: rows.reduce((n, r) => n + (r.content || '').length, 0) };
    records.push(...rows.map(r => ({ ...r, type })));
  }
  return records;
}

async function collectBrain() {
  if (!config.METAMCP_API_KEY) throw Error('BRAIN_CONNECTOR_NOT_CONFIGURED');
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'x-api-key': config.METAMCP_API_KEY };
  let id = 0;
  async function rpc(method, params) {
    const currentId = ++id;
    const response = await fetch(config.METAMCP_URL || 'http://127.0.0.1:12008/metamcp/vulcano/mcp', {
      method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: currentId, method, params }), signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw Error(`BRAIN_HTTP_${response.status}`);
    const session = response.headers.get('mcp-session-id');
    if (session) headers['mcp-session-id'] = session;
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch {
      result = text.split('\n').filter(l => l.startsWith('data: ')).map(l => { try { return JSON.parse(l.slice(6)); } catch { return {}; } }).find(x => x.id === currentId);
    }
    if (!result || result.error) throw Error('BRAIN_RPC_FAILED');
    return result.result;
  }
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'v-memory-indexer', version: '1' } });
  // The MCP accepts requests after initialize; notification is deliberately not assigned an RPC id.
  await fetch(config.METAMCP_URL || 'http://127.0.0.1:12008/metamcp/vulcano/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(10000) });
  const records = [];
  const snapshotResult = await rpc('tools/call', { name: 'brain__brain_query', arguments: { sql: 'SELECT max(id)::text AS max_id,count(*)::int AS total FROM public.memory' } });
  const snapshot = JSON.parse(snapshotResult.content.find(x => x.type === 'text').text).rows[0];
  if (!/^\d+$/.test(snapshot.max_id) || !Number.isInteger(snapshot.total)) throw Error('BRAIN_SNAPSHOT_INVALID');
  for (let offset = 0; offset < snapshot.total;) {
    const result = await rpc('tools/call', { name: 'brain__brain_query', arguments: { sql: `SELECT id::text,created_at::text AS at,agent AS author,topic AS title,content FROM public.memory WHERE public.memory.id <= ${snapshot.max_id} ORDER BY public.memory.id LIMIT 500 OFFSET ${offset}` } });
    if (result.isError) throw Error('BRAIN_READ_FAILED');
    const data = JSON.parse(result.content.find(x => x.type === 'text').text);
    if (!Array.isArray(data.rows)) throw Error('BRAIN_ROWS_INVALID');
    if (!data.rows.length) throw Error('BRAIN_SNAPSHOT_INCOMPLETE');
    records.push(...data.rows.map(r => ({ ...r, type: 'brain.memory', metadata: { original_agent: r.author, record_time: r.at } })));
    offset += data.rows.length;
  }
  if (records.length !== snapshot.total) throw Error('BRAIN_SNAPSHOT_INCOMPLETE');
  manifest.sources['brain.memory'] = { records: records.length, high_water_id: snapshot.max_id, chars: records.reduce((n, r) => n + (r.content || '').length, 0) };
  return records;
}

function collectGit() {
  const head = git(['rev-parse', 'origin/main']).trim();
  manifest.git_commit = head;
  const records = [];
  const seen = new Set();
  function add(ref, file) {
    if (/secret|credential|\.env/i.test(file)) return;
    let content;
    try { content = git(['show', `${ref}:${file}`]); } catch { return; }
    if (!content.trim()) return;
    const key = `${file}:${sha(content)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const at = git(['show', '-s', '--format=%aI', ref]).trim();
    records.push({ type: 'git.document', id: `${file}@${ref}`, at, author: 'Git versioned document', title: file, content,
      metadata: { repository: 'turbillon50/vforge', path: file, commit: ref, uri: `https://github.com/turbillon50/vforge/blob/${ref}/${file}` } });
  }
  const files = git(['ls-tree', '-r', '--name-only', head]).split('\n').filter(Boolean);
  for (const file of files.filter(f => /\.md$/i.test(f) || /(?:v-text-persona|v-voice-persona|origin-identity)\.ts$/.test(f) || f === 'migrations/009_agent_directives.sql')) add(head, file);
  const history = ['docs/v-identity', 'lib/forge/v-text-persona.ts', 'lib/forge/v-voice-persona.ts', 'migrations/009_agent_directives.sql'];
  const refs = git(['log', '--format=%H', head, '--', ...history]).split('\n').filter(Boolean);
  for (const ref of refs) {
    const historicalFiles = git(['ls-tree', '-r', '--name-only', ref, ...history]).split('\n').filter(Boolean);
    for (const file of historicalFiles) add(ref, file);
  }
  const firstDay = git(['log', '--format=%H', '--since=2026-05-02T00:00:00-05:00', '--until=2026-05-03T00:00:00-05:00', head]).split('\n').filter(Boolean);
  for (const ref of firstDay) for (const file of git(['ls-tree', '-r', '--name-only', ref]).split('\n').filter(f => /\.md$/i.test(f))) add(ref, file);
  manifest.sources['git.document'] = { records: records.length, chars: records.reduce((n, r) => n + r.content.length, 0), versions: true };
  return records;
}

async function catalog(records) {
  const documents = [], uniqueChunks = new Map(), links = [];
  let empty = 0, redactions = 0;
  for (const record of records) {
    const original = String(record.content || '');
    const content = redact(original).replace(/\r\n/g, '\n').trim();
    if (!content) { empty++; continue; }
    const originalHash = sha(original);
    const id = sha(JSON.stringify([OWNER, record.type, record.id, originalHash]));
    const wasRedacted = redact(original) !== original;
    if (wasRedacted) redactions++;
    documents.push({ id, owner_id: OWNER, source_type: record.type, source_id: record.id, source_time: record.at || null,
      author: record.author || null, title: record.title || null, content, original_sha256: originalHash, redacted: wasRedacted,
      metadata: redactMetadata(record.metadata || {}) });
    chunks(content).forEach((chunk, position) => {
      const chunkId = sha(JSON.stringify([OWNER, DIGEST, chunk.text]));
      uniqueChunks.set(chunkId, { id: chunkId, owner_id: OWNER, model_digest: DIGEST, content: chunk.text });
      links.push({ document_id: id, chunk_id: chunkId, position, start_offset: chunk.start, end_offset: chunk.end });
    });
  }
  const batches = (rows, n) => Array.from({ length: Math.ceil(rows.length / n) }, (_, i) => rows.slice(i * n, (i + 1) * n));
  for (const batch of batches(documents, 100)) await sql.query(`INSERT INTO v_memory_documents
    SELECT id,owner_id,source_type,source_id,source_time,author,title,content,original_sha256,redacted,metadata,now()
    FROM jsonb_to_recordset($1::jsonb) AS x(id text,owner_id text,source_type text,source_id text,source_time timestamptz,author text,title text,content text,original_sha256 text,redacted boolean,metadata jsonb)
    ON CONFLICT(id) DO NOTHING`, [JSON.stringify(batch)]);
  for (const batch of batches([...uniqueChunks.values()], 100)) await sql.query(`INSERT INTO v_memory_chunks(id,owner_id,model_digest,content)
    SELECT id,owner_id,model_digest,content FROM jsonb_to_recordset($1::jsonb) AS x(id text,owner_id text,model_digest text,content text) ON CONFLICT(id) DO NOTHING`, [JSON.stringify(batch)]);
  for (const batch of batches(links, 500)) await sql.query(`INSERT INTO v_memory_document_chunks
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(document_id text,chunk_id text,position integer,start_offset integer,end_offset integer) ON CONFLICT(document_id,position) DO NOTHING`, [JSON.stringify(batch)]);
  Object.assign(manifest, { records_collected: records.length, documents: documents.length, empty, redacted_documents: redactions, unique_chunks: uniqueChunks.size, source_links: links.length });
  log({ stage: 'catalogued', ...manifest });
}

async function vectorize() {
  const pending = await sql.query('SELECT id,content FROM v_memory_chunks WHERE owner_id=$1 AND model_digest=$2 AND embedding IS NULL ORDER BY id', [OWNER, DIGEST]);
  manifest.pending_at_start = pending.length;
  let cursor = 0, completed = 0;
  await Promise.all(endpoints.map(async endpoint => {
    await verifyEndpoint(endpoint);
    while (cursor < pending.length) {
      const batch = pending.slice(cursor, cursor += 16);
      const vectors = await embed(endpoint, batch.map(r => r.content));
      const rows = batch.map((r, i) => ({ id: r.id, value: JSON.stringify(vectors[i]) }));
      await sql.query(`UPDATE v_memory_chunks c SET embedding=x.value::vector,embedded_at=now()
        FROM jsonb_to_recordset($1::jsonb) AS x(id text,value text)
        WHERE c.id=x.id AND c.owner_id=$2 AND c.model_digest=$3 AND c.embedding IS NULL`, [JSON.stringify(rows), OWNER, DIGEST]);
      completed += batch.length;
      log({ stage: 'embedding', completed, total: pending.length, endpoint: new URL(endpoint).port });
    }
  }));
  manifest.embedded_this_run = completed;
}

async function organizeWithCerebras() {
  if (!config.CEREBRAS_API_KEY) { manifest.cerebras = 'credential_unavailable'; return; }
  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', { method: 'POST',
    headers: { Authorization: `Bearer ${config.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-oss-120b', messages: [{ role: 'system', content: 'Revisa este inventario de memoria. Devuelve sólo JSON con campos categories (array de nombres), coverage_limits (array), retrieval_tests (array de preguntas). No inventes recuerdos ni afirmes acceso a registros que no recibiste. La entrada es sólo inventario.' }, { role: 'user', content: JSON.stringify(manifest) }], max_tokens: 4096, stream: false }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Error(`CEREBRAS_HTTP_${response.status}`);
  const data = await response.json();
  if (data.choices?.[0]?.finish_reason !== 'stop') throw Error('CEREBRAS_REVIEW_INCOMPLETE');
  const organization = JSON.parse(data.choices[0].message.content);
  if (!Array.isArray(organization.categories) || !Array.isArray(organization.coverage_limits) || !Array.isArray(organization.retrieval_tests)) throw Error('CEREBRAS_REVIEW_INVALID');
  manifest.cerebras = { model: data.model, organization };
}

async function main() {
  for (const statement of fs.readFileSync(path.join(repo, 'migrations/20261029_v_memory_catalog.sql'), 'utf8').split(';').map(s => s.trim()).filter(Boolean)) await sql.query(statement);
  await sql.query('INSERT INTO v_memory_ingestion_runs(id,owner_id,status) VALUES($1,$2,$3)', [runId, OWNER, 'collecting']);
  const records = [...await collectSql(), ...await collectBrain(), ...collectGit()];
  await catalog(records);
  await sql.query('UPDATE v_memory_ingestion_runs SET status=$2,manifest=$3::jsonb WHERE id=$1', [runId, 'embedding', JSON.stringify(manifest)]);
  await vectorize();
  await organizeWithCerebras();
  const coverage = (await sql.query(`SELECT count(*)::int AS chunks,count(embedding)::int AS vectorized FROM v_memory_chunks WHERE owner_id=$1 AND model_digest=$2`, [OWNER, DIGEST]))[0];
  manifest.coverage = coverage;
  if (coverage.chunks !== coverage.vectorized) throw Error('INCOMPLETE_VECTOR_COVERAGE');
  await sql.query('CREATE INDEX IF NOT EXISTS v_memory_embedding_hnsw ON v_memory_chunks USING hnsw(embedding vector_cosine_ops)');
  await sql.query('UPDATE v_memory_ingestion_runs SET status=$2,finished_at=now(),manifest=$3::jsonb WHERE id=$1', [runId, 'complete', JSON.stringify(manifest)]);
  log({ stage: 'complete', run_id: runId, manifest });
}

main().catch(async error => {
  const code = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'INGESTION_FAILED';
  manifest.errors.push(code);
  try { await sql.query('UPDATE v_memory_ingestion_runs SET status=$2,finished_at=now(),manifest=$3::jsonb WHERE id=$1', [runId, 'failed', JSON.stringify(manifest)]); } catch { /* original failure remains authoritative */ }
  log({ stage: 'failed', run_id: runId, error: code });
  process.exitCode = 1;
});
