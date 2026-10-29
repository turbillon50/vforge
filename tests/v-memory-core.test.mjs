import test from 'node:test';
import assert from 'node:assert/strict';
import { chunks, redact, redactMetadata, validVector, embed, verifyEndpoint, DIGEST } from '../scripts/lib/v-memory-core.mjs';

test('overlapping chunks cover the complete indexed text without holes', () => {
  const text = 'La historia conserva autor y fecha. '.repeat(300).trim();
  const rows = chunks(text);
  let recovered = rows[0].text;
  for (let i = 1; i < rows.length; i++) recovered += rows[i].text.slice(rows[i - 1].end - rows[i].start);
  assert.equal(recovered, text);
  assert.equal(rows.at(-1).end, text.length);
  assert.throws(() => chunks(text, 10, 10));
});
test('credential copies are removed while teachings remain searchable', () => {
  const text = 'Luis: conserva mi historia. DATABASE_URL=postgresql://user:pass@host/db\nAPI_KEY="private-value"\nBearer abcdefghijklmnopqrstuvwxyz012345';
  const result = redact(text);
  assert.match(result, /conserva mi historia/);
  assert.ok(!result.includes('user:pass') && !result.includes('private-value') && !result.includes('abcdefghijklmnopqrstuvwxyz012345'));
});
test('vectors must have the expected dimension and finite values', () => {
  assert.equal(validVector(Array(768).fill(0)), false);
  assert.equal(validVector(Array(767).fill(1)), false);
  assert.equal(validVector([...Array(767).fill(1), NaN]), false);
  assert.equal(validVector(Array(768).fill(0.1)), true);
});
test('nested metadata keeps provenance and never breaks JSON during credential filtering', () => {
  const result = redactMetadata({ author: 'Luis', details: { API_KEY: 'private-value', source: 'GitHub' } });
  assert.equal(JSON.parse(JSON.stringify(result)).details.API_KEY, '[REDACTED]');
  assert.equal(result.details.source, 'GitHub');
  assert.equal(result.author, 'Luis');
});
test('batch response shape and model digest are verified before indexing', async () => {
  await assert.rejects(embed('https://test.invalid', ['a', 'b'], false, async () => Response.json({ embeddings: [Array(768).fill(1)] })), /INVALID_EMBEDDINGS/);
  await assert.rejects(verifyEndpoint('https://test.invalid', async () => Response.json({ models: [{ name: 'nomic-embed-text:latest', digest: 'other' }] })), /EMBED_MODEL_MISMATCH/);
  await verifyEndpoint('https://test.invalid', async () => Response.json({ models: [{ name: 'nomic-embed-text:latest', digest: DIGEST }] }));
});
