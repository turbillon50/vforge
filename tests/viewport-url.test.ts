import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePublishedUrl,
  resolveInstitutionalAdminUrl,
  resolveProjectViewportUrls,
} from "../lib/projects/viewport-url";

describe("normalizePublishedUrl", () => {
  it("acepta https y host sin esquema", () => {
    assert.equal(
      normalizePublishedUrl("https://lu-spa.vercel.app/"),
      "https://lu-spa.vercel.app/",
    );
    assert.equal(
      normalizePublishedUrl("lu-spa.vercel.app"),
      "https://lu-spa.vercel.app/",
    );
  });

  it("rechaza protocolos peligrosos", () => {
    assert.equal(normalizePublishedUrl("javascript:alert(1)"), null);
  });
});

describe("resolveInstitutionalAdminUrl", () => {
  it("añade /admin al origen del proyecto", () => {
    assert.equal(
      resolveInstitutionalAdminUrl("https://ssante.life"),
      "https://ssante.life/admin",
    );
  });

  it("no duplica /admin", () => {
    assert.equal(
      resolveInstitutionalAdminUrl("https://ssante.life/admin"),
      "https://ssante.life/admin",
    );
  });
});

describe("resolveProjectViewportUrls", () => {
  it("infiere admin institucional cuando no hay admin_url", () => {
    const resolved = resolveProjectViewportUrls({
      desktop_url: null,
      mobile_url: null,
      admin_url: null,
      vercel_url: "https://lu-spa.vercel.app",
      domain: null,
    });
    assert.equal(resolved.desktop_url, "https://lu-spa.vercel.app/");
    assert.equal(resolved.mobile_url, "https://lu-spa.vercel.app/");
    assert.equal(resolved.admin_url, "https://lu-spa.vercel.app/admin");
  });

  it("respeta admin_url explícita", () => {
    const resolved = resolveProjectViewportUrls({
      desktop_url: "https://app.example.com/",
      mobile_url: "https://app.example.com/",
      admin_url: "https://app.example.com/dashboard",
      vercel_url: null,
      domain: null,
    });
    assert.equal(resolved.admin_url, "https://app.example.com/dashboard");
  });

  it("prioriza domain para admin base", () => {
    const resolved = resolveProjectViewportUrls({
      desktop_url: null,
      mobile_url: null,
      admin_url: null,
      vercel_url: "https://x.vercel.app",
      domain: "ssante.life",
    });
    // vercel_url gana como publishedFallback (mismo orden histórico)
    assert.equal(resolved.admin_url, "https://x.vercel.app/admin");
  });
});
