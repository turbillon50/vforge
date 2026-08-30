import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntegrationCatalog,
  isSafeSecretName,
  maskSecretPreview,
  secretLooksLike,
} from "../lib/live/project-tools";

test("catalog marks github and vercel from the project, MCP always available", () => {
  const catalog = buildIntegrationCatalog({
    github: true,
    vercel: true,
    neon: false,
  });
  const github = catalog.find((item) => item.kind === "github");
  const mcp = catalog.find((item) => item.kind === "mcp");
  const neon = catalog.find((item) => item.kind === "neon");
  assert.equal(github?.status, "connected");
  assert.equal(mcp?.status, "available");
  assert.equal(neon?.status, "available");
});

test("vault never pretends to show a value", () => {
  assert.equal(maskSecretPreview(), "••••••••");
  assert.equal(isSafeSecretName("STRIPE_SECRET_KEY"), true);
  assert.equal(isSafeSecretName("stripe key"), false);
  assert.equal(secretLooksLike("NEON_DATABASE_URL", "NEON"), true);
});
