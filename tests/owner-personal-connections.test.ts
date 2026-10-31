import assert from "node:assert/strict";
import test from "node:test";
import Module from "node:module";
import type { ResolvedAccess } from "../lib/connect/resolve-token";

const loader = Module as unknown as {
  _load(request: string, ...args: unknown[]): unknown;
};
const original = loader._load;
let email = "turbillon50@gmail.com";
let personal: Record<string, string> = {};
let operatorReads = 0;
loader._load = function (request, ...args) {
  if (request === "@clerk/nextjs/server") return {
    clerkClient: async () => ({ users: { getUser: async () => ({ emailAddresses: [{ emailAddress: email, verification: { status: "verified" } }] }) } }),
    auth: async () => ({ userId: "test-user" }),
  };
  if (request === "@/lib/connect/user-vault") return {
    getUserSecret: async (_id: string, name: string) => personal[name] || null,
  };
  if (request === "@/lib/connect/clerk-oauth-sync") return { syncClerkOAuthTokens: async () => null };
  if (request === "@/lib/vault/get-secret") return {
    getOperatorSecret: async (name: string) => { operatorReads++; return `operator:${name}`; },
  };
  return original.call(this, request, ...args);
};
// Load while the dependency seam is installed; the captured imports remain stubbed.
const resolver = require("../lib/connect/resolve-token") as {
  resolveAccessForUser(id: string | null): Promise<ResolvedAccess>;
};
loader._load = original;

test("a platform owner keeps personal provider connections after promotion", async () => {
  email = "turbillon50@gmail.com";
  personal = { GITHUB_USER_TOKEN: "personal-github", VERCEL_USER_TOKEN: "personal-vercel" };
  operatorReads = 0;
  const access = await resolver.resolveAccessForUser("test-user");
  assert.equal(access.isOwner, true);
  assert.equal(access.githubToken, "personal-github");
  assert.equal(access.vercelToken, "personal-vercel");
  assert.equal(operatorReads, 0);
});

test("an owner falls back only for the missing provider", async () => {
  email = "turbillon50@gmail.com";
  personal = { GITHUB_USER_TOKEN: "personal-github" };
  operatorReads = 0;
  const access = await resolver.resolveAccessForUser("test-user");
  assert.equal(access.githubToken, "personal-github");
  assert.equal(access.vercelToken, "operator:VERCEL_TOKEN");
  assert.equal(operatorReads, 1);
});

test("a client without personal connections never borrows operator credentials", async () => {
  email = "client@example.com";
  personal = {};
  operatorReads = 0;
  const access = await resolver.resolveAccessForUser("test-client");
  assert.equal(access.isOwner, false);
  assert.equal(access.githubToken, null);
  assert.equal(access.vercelToken, null);
  assert.equal(operatorReads, 0);
});
