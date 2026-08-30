import test from "node:test";
import assert from "node:assert/strict";
import {
  isAcceptedZip,
  isSafeProjectBlobPath,
  parseReviewAnchor,
  safeArchiveName,
} from "../lib/live/review-context";

test("parseReviewAnchor accepts normalized cross-origin coordinates", () => {
  assert.deepEqual(
    parseReviewAnchor({
      viewport: "mobile",
      x: 0.123456,
      y: 0.8,
      url: "https://example.com/app",
      label: "CTA principal",
    }),
    {
      viewport: "mobile",
      x: 0.1235,
      y: 0.8,
      url: "https://example.com/app",
      label: "CTA principal",
    },
  );
});

test("parseReviewAnchor fails closed", () => {
  assert.equal(parseReviewAnchor({ viewport: "desktop", x: -1, y: 0.2, url: "https://a.test" }), null);
  assert.equal(parseReviewAnchor({ viewport: "tablet", x: 0.2, y: 0.2, url: "https://a.test" }), null);
  assert.equal(parseReviewAnchor({ viewport: "admin", x: 0.2, y: 0.2, url: "javascript:alert(1)" }), null);
});

test("ZIP validation rejects renamed or oversized files", () => {
  assert.equal(isAcceptedZip("chat.zip", "application/zip", 2048), true);
  assert.equal(isAcceptedZip("chat.pdf", "application/zip", 2048), false);
  assert.equal(isAcceptedZip("chat.zip", "application/zip", 51 * 1024 * 1024), false);
  assert.equal(safeArchiveName("Conversación cliente #1.zip"), "Conversaci_n_cliente_1.zip");
});

test("private Blob paths stay inside the exact project namespace", () => {
  assert.equal(isSafeProjectBlobPath("apsus", "context/apsus/123-chat.zip"), true);
  assert.equal(isSafeProjectBlobPath("apsus", "context/apsus/../secret.zip"), false);
  assert.equal(isSafeProjectBlobPath("apsus", "context/apsus/%2e%2e/secret.zip"), false);
  assert.equal(isSafeProjectBlobPath("apsus", "context/apsus\\secret.zip"), false);
  assert.equal(isSafeProjectBlobPath("apsus", "context/otro/123-chat.zip"), false);
});
