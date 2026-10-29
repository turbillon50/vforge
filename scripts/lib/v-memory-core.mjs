import crypto from 'node:crypto';

export const MODEL = 'nomic-embed-text:latest';
export const DIGEST = '0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f';
export const OWNER = 'operator_luis';
export const sha = value => crypto.createHash('sha256').update(value).digest('hex');

export function redact(text) {
  return String(text || '')
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[PRIVATE KEY REDACTED]')
    .replace(/\b(postgres(?:ql)?:\/\/)[^\s@]+@/gi, '$1[REDACTED]@')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|csk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{20,})\b/g, '[TOKEN REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9_.\/-]{24,}/gi, '$1[REDACTED]')
    .replace(/((?:[A-Z_]*(?:API_KEY|ACCESS_TOKEN|SECRET|PASSWORD|PRIVATE_KEY)|DATABASE_URL)["']?\s*[:=]\s*)(["'][^"'\n]*["']|[^\s,;}]+)/gi, '$1[REDACTED]');
}

export function redactMetadata(value) {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactMetadata);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, /(?:api.?key|token|secret|password|private.?key|database.?url)/i.test(key) ? '[REDACTED]' : redactMetadata(item)]));
  return value;
}

export function chunks(value, size = 1400, overlap = 160) {
  if (!Number.isInteger(size) || !Number.isInteger(overlap) || size < 1 || overlap < 0 || overlap >= size) throw Error('INVALID_CHUNK_SIZE');
  const text = value.replace(/\r\n/g, '\n').trim();
  const points = Array.from(text);
  const offsets = [0];
  for (const point of points) offsets.push(offsets.at(-1) + point.length);
  const result = [];
  for (let start = 0; start < points.length;) {
    const end = Math.min(start + size, points.length);
    result.push({ text: points.slice(start, end).join(''), start: offsets[start], end: offsets[end] });
    if (end === points.length) break;
    start = end - overlap;
  }
  return result;
}

export function validVector(vector) {
  return Array.isArray(vector) && vector.length === 768 && vector.every(Number.isFinite) && vector.some(x => x !== 0);
}

export async function verifyEndpoint(endpoint, fetcher = fetch) {
  const response = await fetcher(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Error('EMBED_ENDPOINT_UNAVAILABLE');
  const model = (await response.json()).models?.find(m => m.name === MODEL);
  if (model?.digest !== DIGEST) throw Error('EMBED_MODEL_MISMATCH');
}

export async function embed(endpoint, texts, query = false, fetcher = fetch) {
  const response = await fetcher(`${endpoint}/api/embed`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: texts.map(t => `${query ? 'search_query' : 'search_document'}: ${t}`), truncate: false, keep_alive: '10m' }),
    signal: AbortSignal.timeout(query ? 8000 : 120000),
  });
  if (!response.ok) throw Error(`EMBED_HTTP_${response.status}`);
  const vectors = (await response.json()).embeddings;
  if (!Array.isArray(vectors) || vectors.length !== texts.length || !vectors.every(validVector)) throw Error('INVALID_EMBEDDINGS');
  return vectors;
}
