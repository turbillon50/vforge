import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_RANK,
  roleAtLeast,
  isLiveRole,
  isInvitableRole,
  normalizeRole,
  resolveMembership,
  checkInvitation,
} from "../lib/projects/roles";

const NOW = new Date("2026-08-18T00:00:00.000Z");
const future = new Date("2026-12-31T00:00:00.000Z").toISOString();
const past = new Date("2026-01-01T00:00:00.000Z").toISOString();

test("ROLE_RANK order owner > reviewer > observer", () => {
  assert.ok(ROLE_RANK.owner > ROLE_RANK.reviewer);
  assert.ok(ROLE_RANK.reviewer > ROLE_RANK.observer);
});

test("roleAtLeast respects hierarchy", () => {
  assert.equal(roleAtLeast("owner", "observer"), true);
  assert.equal(roleAtLeast("reviewer", "reviewer"), true);
  assert.equal(roleAtLeast("observer", "reviewer"), false);
  assert.equal(roleAtLeast("reviewer", "owner"), false);
});

test("isLiveRole / normalizeRole are fail-closed", () => {
  assert.equal(isLiveRole("owner"), true);
  assert.equal(isLiveRole("admin"), false);
  assert.equal(isLiveRole(null), false);
  assert.equal(normalizeRole("reviewer"), "reviewer");
  assert.equal(normalizeRole("editor"), "observer"); // desconocido -> menor privilegio
  assert.equal(normalizeRole(undefined), "observer");
});

test("isInvitableRole: solo observer/reviewer, nunca owner", () => {
  assert.equal(isInvitableRole("observer"), true);
  assert.equal(isInvitableRole("reviewer"), true);
  assert.equal(isInvitableRole("owner"), false);
  assert.equal(isInvitableRole("admin"), false);
  assert.equal(isInvitableRole(null), false);
  assert.equal(isInvitableRole(undefined), false);
});

test("resolveMembership: active, no expiry -> role", () => {
  assert.equal(
    resolveMembership({ role: "reviewer", status: "active", expires_at: null }, NOW),
    "reviewer",
  );
});

test("resolveMembership: future expiry -> role", () => {
  assert.equal(
    resolveMembership({ role: "owner", status: "active", expires_at: future }, NOW),
    "owner",
  );
});

test("resolveMembership: expired -> null", () => {
  assert.equal(
    resolveMembership({ role: "owner", status: "active", expires_at: past }, NOW),
    null,
  );
});

test("resolveMembership: revoked -> null", () => {
  assert.equal(
    resolveMembership({ role: "owner", status: "revoked", expires_at: null }, NOW),
    null,
  );
});

test("resolveMembership: invalid role / null row / bad date -> null", () => {
  assert.equal(
    resolveMembership({ role: "superuser", status: "active", expires_at: null }, NOW),
    null,
  );
  assert.equal(resolveMembership(null, NOW), null);
  assert.equal(
    resolveMembership({ role: "owner", status: "active", expires_at: "not-a-date" }, NOW),
    null,
  );
});

test("checkInvitation: happy path", () => {
  const r = checkInvitation(
    { role: "reviewer", email: "Cliente@Test.com", expires_at: future, accepted_at: null },
    "cliente@test.com",
    NOW,
  );
  assert.deepEqual(r, { ok: true, role: "reviewer" });
});

test("checkInvitation: 