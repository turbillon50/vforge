import assert from "node:assert/strict";
import test from "node:test";
import {
  membershipBelongsToUserSql,
  normalizeScopedIdentity,
} from "../lib/projects/membership-scope";

test("normalizeScopedIdentity is fail-closed without a Clerk user id", () => {
  assert.equal(normalizeScopedIdentity("", "a@b.com"), null);
  assert.equal(normalizeScopedIdentity(null, "a@b.com"), null);
  assert.equal(normalizeScopedIdentity("user_1", ""), null);
  assert.deepEqual(normalizeScopedIdentity("user_1", "  A@B.com "), {
    clerkUserId: "user_1",
    email: "a@b.com",
  });
});

test("membership predicate never matches all rows", () => {
  const sql = membershipBelongsToUserSql("pm", "$1", "$2");
  assert.match(sql, /pm\.clerk_user_id = \$1/);
  assert.match(sql, /lower\(pm\.email\) = \$2/);
  assert.doesNotMatch(sql, /1\s*=\s*1/);
  assert.doesNotMatch(sql, /true/i);
});
