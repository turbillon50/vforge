import test from "node:test";
import assert from "node:assert/strict";
import {
  anchorViewportPosition,
  documentPointForAnchor,
  isAcceptedZip,
  isSafeProjectBlobPath,
  parseReviewAnchor,
  parseReviewBridgeViewport,
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

test("scroll-aware anchors keep their document position", () => {
  const bridge = parseReviewBridgeViewport({
    source: "vforge-review-bridge",
    type: "viewport",
    version: 1,
    scrollX: 0,
    scrollY: 600,
    viewportWidth: 1440,
    viewportHeight: 900,
    documentWidth: 1440,
    documentHeight: 2400,
  });
  assert.ok(bridge);
  assert.deepEqual(documentPointForAnchor(0.25, 0.5, bridge), {
    documentX: 360,
    documentY: 1050,
  });

  const anchor = parseReviewAnchor({
    viewport: "desktop",
    x: 0.25,
    y: 0.5,
    url: "https://example.com",
    documentX: 360,
    documentY: 1050,
  });
  assert.ok(anchor);
  assert.deepEqual(anchorViewportPosition(anchor, bridge), {
    x: 0.25,
    y: 0.5,
    visible: true,
  });
  assert.deepEqual(
    anchorViewportPosition(anchor, { ...bridge, scrollY: 1050 }),
    { x: 0.25, y: 0, visible: true },
  );
  assert.equal(
    anchorViewportPosition(anchor, { ...bridge, scrollY: 1200 }).visible,
    false,
  );
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
