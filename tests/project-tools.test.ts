import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntegrationCatalog,
  isForbiddenAutomation,
  isSafeDomain,
  isSafeSecretName,
  maskSecretPreview,
  mcpClientConfig,
  parseGithubRepo,
  roomToolsBrief,
  secretLooksLike,
  VERCEL_TOOL_ACTIONS,
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
  assert.ok(catalog.some((item) => item.kind === "mercadopago"));
  assert.ok(catalog.some((item) => item.kind === "hetzner"));
  assert.equal(catalog.some((item) => item.kind === "n8n"), false);
});

test("n8n is never a suggested integration", () => {
  const catalog = buildIntegrationCatalog({
    rows: [{ kind: "n8n", label: "n8n", status: "connected" }],
  });
  assert.equal(catalog.some((item) => item.kind === "n8n"), false);
  assert.equal(isForbiddenAutomation("n8n"), true);
  assert.equal(isForbiddenAutomation("mcp"), false);
});

test("vercel exposes real tools, not just a dump", () => {
  const ids = VERCEL_TOOL_ACTIONS.map((item) => item.id);
  assert.ok(ids.includes("deploys"));
  assert.ok(ids.includes("promote"));
  assert.ok(ids.includes("redeploy"));
  assert.ok(ids.includes("domains"));
  assert.ok(ids.includes("env"));
  assert.ok(VERCEL_TOOL_ACTIONS.length >= 7);
});

test("vault never pretends to show a value", () => {
  assert.equal(maskSecretPreview(), "••••••••");
  assert.equal(isSafeSecretName("STRIPE_SECRET_KEY"), true);
  assert.equal(isSafeSecretName("stripe key"), false);
  assert.equal(secretLooksLike("NEON_DATABASE_URL", "NEON"), true);
});

test("github repo and domain parsers stay strict", () => {
  assert.equal(parseGithubRepo("https://github.com/acme/app.git"), "acme/app");
  assert.equal(parseGithubRepo("acme/app"), "acme/app");
  assert.equal(parseGithubRepo("not a repo"), null);
  assert.equal(isSafeDomain("netmas.mx"), true);
  assert.equal(isSafeDomain("https://evil.example/path"), false);
  assert.equal(isSafeDomain("localhost"), false);
});

test("MCP config is copy-paste for Claude, Cursor and Grok", () => {
  const config = mcpClientConfig({ name: "VForge · demo", url: "https://vforge.site/api/mcp" });
  assert.ok(config.claude);
  assert.ok(config.cursor);
  assert.equal(config.grok.auth, "Bearer");
});

test("room brief tells V to suggest MCP and skip n8n", () => {
  const brief = roomToolsBrief();
  assert.match(brief, /MCP/);
  assert.match(brief, /n8n/i);
  assert.match(brief, /Vercel/);
  assert.match(brief, /vforge_project_see/);
});
