import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_OWNER_EMAILS,
  isOwnerEmail,
  isOwnerUser,
  parseOwnerEmails,
} from "../lib/auth/owner";

test("the default owner allowlist contains only the canonical accounts", () => {
  assert.deepEqual(parseOwnerEmails(), [...DEFAULT_OWNER_EMAILS]);
  assert.equal(parseOwnerEmails().includes("dluisdelatorre@gmail.com"), false);
  assert.equal(parseOwnerEmails().includes("luisdelator@vmomentums.info"), false);
});

test("owner email matching is normalized", () => {
  assert.equal(isOwnerEmail("  TURBILLON50@GMAIL.COM "), true);
  assert.equal(isOwnerEmail("cliente@example.com"), false);
});

test("stale Clerk owner metadata cannot elevate a secondary account", () => {
  const staleUser = {
    emailAddresses: [{ emailAddress: "dluisdelatorre@gmail.com" }],
    publicMetadata: { role: "owner" },
  };

  assert.equal(isOwnerUser(staleUser), false);
});
