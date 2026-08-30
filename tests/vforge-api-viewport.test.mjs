import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePublishedUrl,
  resolveProjectViewportUrls,
} from "../services/vforge-api/viewport-url.mjs";

const emptyProject = {
  desktop_url: null,
  mobile_url: null,
  admin_url: null,
  vercel_url: null,
  domain: null,
};

test("standalone API inherits a historical domain for both responsive previews", () => {
  assert.deepEqual(
    resolveProjectViewportUrls({ ...emptyProject, domain: "carnesn.ink" }),
    {
      desktop_url: "https://carnesn.ink/",
      mobile_url: "https://carnesn.ink/",
      admin_url: null,
    },
  );
});

test("standalone API prefers explicit viewports and never infers admin", () => {
  assert.deepEqual(
    resolveProjectViewportUrls({
      ...emptyProject,
      desktop_url: "desktop.example.com",
      mobile_url: "mobile.example.com",
      vercel_url: "fallback.vercel.app",
    }),
    {
      desktop_url: "https://desktop.example.com/",
      mobile_url: "https://mobile.example.com/",
      admin_url: null,
    },
  );
});

test("standalone API rejects executable URLs and embedded credentials", () => {
  assert.equal(normalizePublishedUrl("javascript:alert(1)"), null);
  assert.equal(normalizePublishedUrl("https://user:secret@example.com"), null);
});
