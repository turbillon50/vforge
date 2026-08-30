import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeConnectionScopes,
  oauthCallbackMessage,
} from "../lib/connect/connection-scopes";

test("normalizeConnectionScopes maps Clerk mirrors to canonical names", () => {
  assert.deepEqual(
    normalizeConnectionScopes(["github-clerk", "vercel-clerk", "stripe"]).sort(),
    ["github", "stripe", "vercel"],
  );
  assert.deepEqual(normalizeConnectionScopes(["github", "github-clerk"]), [
    "github",
  ]);
});

test("oauthCallbackMessage stays quiet on success and explains failures", () => {
  assert.equal(oauthCallbackMessage("GitHub", "connected"), null);
  assert.equal(oauthCallbackMessage("GitHub", null), null);
  assert.match(oauthCallbackMessage("GitHub", "error_state") ?? "", /GitHub/);
  assert.match(oauthCallbackMessage("Vercel", "error_no_code") ?? "", /Vercel/);
});
