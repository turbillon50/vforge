import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVerdict, decision, askReviewer, validateEvidence } from '../scripts/supervisor-review.mjs';

test('failed checks veto a model approval', () => {
  const verdict = parseVerdict('{"verdict":"APROBADO","findings":[],"action":"Publicar"}');
  assert.equal(decision(verdict, [{ name: 'build', ok: false }]), 'RECHAZADO');
  assert.equal(decision(verdict, [{ name: 'build', ok: true }]), 'APROBADO');
});
test('review findings must quote real source at the claimed location', () => {
  const finding = { file: 'a.js', line: 1, evidence: 'missingImport()', problem: 'ReferenceError' };
  assert.throws(() => validateEvidence({ findings: [finding] }, { 'a.js': 'const ok = 1;' }), /UNSUPPORTED_REVIEW_FINDING/);
  assert.doesNotThrow(() => validateEvidence({ findings: [{ ...finding, evidence: 'const ok = 1;' }] }, { 'a.js': 'const ok = 1;' }));
});
test('malformed or contradictory approvals cannot pass', () => {
  for (const raw of ['Execution error', '{}', '{"verdict":"APROBADO","findings":["auth rota"],"action":"corregir"}']) {
    assert.throws(() => parseVerdict(raw));
  }
});
const config = { provider: 'cerebras', endpoint: 'https://review.invalid', key: 'test-only', model: 'test' };
test('network, HTTP and truncated responses remain errors', async () => {
  for (const fetcher of [async () => { throw new Error('network'); }, async () => new Response('', { status: 503 }),
    async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: '{"verdict":"APROBADO"}' } }] })]) {
    await assert.rejects(askReviewer(config, 'evidence', fetcher));
  }
});
test('Mesh must confirm Cerebras routing', async () => {
  const result = { choices: [{ finish_reason: 'stop', message: { content: '{"verdict":"APROBADO","findings":[],"action":"continuar"}' } }] };
  await assert.rejects(askReviewer({ ...config, provider: 'mesh-cerebras' }, 'evidence', async () => Response.json(result)), /CEREBRAS_ROUTE_UNCONFIRMED/);
  result._mesh = { target: 'cerebras' };
  const review = await askReviewer({ ...config, provider: 'mesh-cerebras' }, 'evidence', async () => Response.json(result));
  assert.equal(review.verdict.verdict, 'APROBADO');
});
