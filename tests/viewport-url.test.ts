import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePublishedUrl,
  resolveProjectViewportUrls,
  type ProjectViewportFields,
} from "../lib/projects/viewport-url";

function project(
  overrides: Partial<ProjectViewportFields> = {},
): ProjectViewportFields {
  return {
    desktop_url: null,
    mobile_url: null,
    admin_url: null,
    vercel_url: null,
    domain: null,
    ...overrides,
  };
}

test("normaliza un dominio histórico como HTTPS", () => {
  assert.equal(normalizePublishedUrl("carnesn.ink"), "https://carnesn.ink/");
});

test("conserva URLs HTTP y HTTPS publicables", () => {
  assert.equal(
    normalizePublishedUrl("https://example.com/catalogo?area=1"),
    "https://example.com/catalogo?area=1",
  );
  assert.equal(normalizePublishedUrl("http://localhost:3000"), "http://localhost:3000/");
});

test("rechaza protocolos ejecutables y credenciales embebidas", () => {
  assert.equal(normalizePublishedUrl("javascript:alert(1)"), null);
  assert.equal(normalizePublishedUrl("https://user:secret@example.com"), null);
});

test("prefiere las URLs explícitas de cada viewport", () => {
  assert.deepEqual(
    resolveProjectViewportUrls(
      project({
        desktop_url: "https://desktop.example.com",
        mobile_url: "https://mobile.example.com",
        vercel_url: "https://fallback.vercel.app",
        domain: "example.com",
      }),
    ),
    {
      desktop_url: "https://desktop.example.com/",
      mobile_url: "https://mobile.example.com/",
      admin_url: null,
    },
  );
});

test("usa vercel_url como fallback responsive", () => {
  assert.deepEqual(
    resolveProjectViewportUrls(
      project({ vercel_url: "https://legacy.vercel.app" }),
    ),
    {
      desktop_url: "https://legacy.vercel.app/",
      mobile_url: "https://legacy.vercel.app/",
      admin_url: null,
    },
  );
});

test("usa el dominio cuando no hay URL de Vercel", () => {
  assert.deepEqual(
    resolveProjectViewportUrls(project({ domain: "carnesn.ink" })),
    {
      desktop_url: "https://carnesn.ink/",
      mobile_url: "https://carnesn.ink/",
      admin_url: null,
    },
  );
});

test("una URL explícita inválida cae al deploy publicado", () => {
  assert.equal(
    resolveProjectViewportUrls(
      project({
        desktop_url: "javascript:alert(1)",
        vercel_url: "legacy.vercel.app",
      }),
    ).desktop_url,
    "https://legacy.vercel.app/",
  );
});

test("administración nunca se infiere desde el dominio", () => {
  const withoutAdmin = resolveProjectViewportUrls(
    project({ domain: "carnesn.ink" }),
  );
  const withAdmin = resolveProjectViewportUrls(
    project({ domain: "carnesn.ink", admin_url: "admin.carnesn.ink" }),
  );

  assert.equal(withoutAdmin.admin_url, null);
  assert.equal(withAdmin.admin_url, "https://admin.carnesn.ink/");
});
