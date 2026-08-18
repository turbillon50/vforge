import test from "node:test";
import assert from "node:assert/strict";
import {
  generateInviteToken,
  hashInviteToken,
  verifyInviteToken,
  sanitizeToken,
} from "../lib/projects/invite-token";

test("generateInviteToken returns url-safe token + matching hash", () => {
  const { token, tokenHash } = generateInviteToken();
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(token.length >= 40);
  assert.equal(tokenHash, hashInviteToken(token));
  assert.match(tokenHash, /^[a-f0-9]{64}$/); // sha256 hex
});

test("two tokens are distinct", () => {
  const a = generateInviteToken();
  const b = generateInviteToken();
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.tokenHash, b.tokenHash);
});

test("hashInviteToken is deterministic", () => {
  assert.equal(hashInviteToken("abc"), hashInviteToken("abc"));
  assert.notEqual(hashInviteToken("abc"), hashInviteToken("abd"));
});

test("verifyInviteToken: correct token passes, wrong fails", () => {
  const { token, tokenHash } = generateInviteToken();
  assert.equal(verifyInviteToken(token, tokenHash), true);
  assert.equal(verifyInviteToken(token + "x", tokenHash), false);
  assert.equal(verifyInviteToken("", tokenHash), false);
  assert.equal(verifyInviteToken(token, "deadbeef"), false); // longitud distinta
});

test("sanitizeToken accepts valid, rejects garbage", () => {
  const { token } = generateInviteToken();
  assert.equal(sanitizeToken(token), token);
  assert.equal(sanitizeToken("  " + token + "  "), token); // trim
  assert.equal(sanitizeToken("short"), null);
  assert.equal(sanitizeToken("has spaces and $ymbols"), null);
  assert.equal(sanitizeToken(12345), null);
  assert.equal(sanitizeToken(null), null);
  assert.equal(sanitizeToken("x".repeat(300)), null);
});
