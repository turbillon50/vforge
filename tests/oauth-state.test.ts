import assert from "node:assert/strict";
import test from "node:test";
import {
  firmarState,
  leerState,
  leerStateCompleto,
  normalizarOAuthReturnPath,
  resolverOAuthCallbackIdentity,
} from "../lib/connect/oauth-state";

process.env.VFORGE_MASTER_PEPPER = "test-pepper-oauth-state";

test("normalizarOAuthReturnPath only allows the onboarding allowlist", () => {
  assert.equal(normalizarOAuthReturnPath("/onboarding"), "/onboarding");
  assert.equal(normalizarOAuthReturnPath("/workspace"), "/workspace");
  assert.equal(
    normalizarOAuthReturnPath("/app/integrations"),
    "/app/integrations",
  );
  assert.equal(
    normalizarOAuthReturnPath("https://evil.example/phish"),
    "/app/integrations",
  );
  assert.equal(normalizarOAuthReturnPath("/app/chat"), "/app/integrations");
  assert.equal(normalizarOAuthReturnPath(null), "/app/integrations");
});

test("firmarState embeds userId and return path; leerState rejects tampering", () => {
  const state = firmarState("user_abc", "/onboarding");
  const parsed = leerStateCompleto(state);
  assert.ok(parsed);
  assert.equal(parsed?.userId, "user_abc");
  assert.equal(parsed?.returnPath, "/onboarding");
  assert.equal(leerState(state), "user_abc");

  assert.equal(leerStateCompleto(null), null);
  assert.equal(leerStateCompleto("not-signed"), null);
  assert.equal(leerStateCompleto(`${state}x`), null);
  const [cuerpo] = state.split(".");
  assert.equal(leerStateCompleto(`${cuerpo}.AAAA`), null);
});

test("resolverOAuthCallbackIdentity prefers a matching session and rejects mismatches", () => {
  assert.deepEqual(resolverOAuthCallbackIdentity(null, "user_a"), {
    userId: "user_a",
    mismatch: false,
  });
  assert.deepEqual(resolverOAuthCallbackIdentity("user_a", null), {
    userId: "user_a",
    mismatch: false,
  });
  assert.deepEqual(resolverOAuthCallbackIdentity("user_a", "user_a"), {
    userId: "user_a",
    mismatch: false,
  });
  assert.deepEqual(resolverOAuthCallbackIdentity("user_a", "user_b"), {
    userId: "user_a",
    mismatch: true,
  });
  assert.deepEqual(resolverOAuthCallbackIdentity(null, null), {
    userId: null,
    mismatch: false,
  });
});
