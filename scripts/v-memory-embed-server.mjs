#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import { MODEL, DIGEST, embed, verifyEndpoint } from './lib/v-memory-core.mjs';

const config = JSON.parse(fs.readFileSync(process.argv[2] || '/etc/vl-secrets/v-memory-embed.json', 'utf8'));
if (typeof config.EMBED_TOKEN !== 'string' || config.EMBED_TOKEN.length < 32 || !config.EMBED_ENDPOINTS?.length) throw Error('INVALID_PRIVATE_CONFIGURATION');
let active = 0, cursor = 0;
const server = http.createServer(async (req, res) => {
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const actual = Buffer.from(token), expected = Buffer.from(config.EMBED_TOKEN);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return send(401, { error: 'unauthorized' });
  if (req.url === '/health' && req.method === 'GET') return send(200, { model: MODEL, digest: DIGEST, dimensions: 768, active });
  if (req.url !== '/embedding' || req.method !== 'POST') return send(404, { error: 'not_found' });
  if (active >= 4) return send(503, { error: 'busy' });
  active++;
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 16384) return send(413, { error: 'input_too_large' });
    }
    let data;
    try { data = JSON.parse(body); } catch { return send(400, { error: 'invalid_json' }); }
    if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 2000) return send(400, { error: 'invalid_text' });
    const start = cursor++;
    const candidates = config.EMBED_ENDPOINTS.map((_, i) => config.EMBED_ENDPOINTS[(start + i) % config.EMBED_ENDPOINTS.length]);
    if (config.FALLBACK_EMBED_ENDPOINT) candidates.push(config.FALLBACK_EMBED_ENDPOINT);
    for (const endpoint of candidates) {
      try {
        await verifyEndpoint(endpoint);
        const [vector] = await embed(endpoint, [data.text], true);
        return send(200, { model: MODEL, digest: DIGEST, dimensions: 768, vector });
      } catch { /* try another verified GPU; never mix model versions */ }
    }
    send(503, { error: 'embedding_unavailable' });
  } catch { if (!res.headersSent) send(400, { error: 'request_failed' }); }
  finally { active--; }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(Number(config.EMBED_PORT || 4116), '127.0.0.1', () => console.log(JSON.stringify({ event: 'ready', port: Number(config.EMBED_PORT || 4116), model: MODEL, digest: DIGEST })));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
