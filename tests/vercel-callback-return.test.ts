import assert from "node:assert/strict";
import test from "node:test";
import { destinoCallbackVercel } from "../lib/connect/oauth-state";

test("missing Vercel state returns the new user to onboarding, not the owner console", () => {
  assert.equal(destinoCallbackVercel(null), "/onboarding");
  assert.equal(destinoCallbackVercel(undefined), "/onboarding");
});

test("signed Vercel return_to is preserved for owner and client", () => {
  assert.equal(destinoCallbackVercel("/app/integrations"), "/app/integrations");
  assert.equal(destinoCallbackVercel("/onboarding"), "/onboarding");
  assert.equal(destinoCallbackVercel("/workspace"), "/workspace");
});
