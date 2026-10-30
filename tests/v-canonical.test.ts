import test from "node:test";
import assert from "node:assert/strict";
import { defaults, mergeConfig, publicConfig } from "../lib/v-canonical/config";
import { privateAddress, inferenceEndpoint } from "../lib/v-canonical/network";
test("V limita bases a cinco, sin limitar MCP o repos", () => {
  const c = structuredClone(defaults);
  for (let i = 0; i < 5; i++)
    c.connections.push({
      id: "db" + i,
      name: "DB",
      kind: "database",
      endpoint: "postgresql://user:password@example.com/db",
      enabled: true,
      status: "pending",
    });
  assert.equal(mergeConfig(c, defaults).connections.length, 8);
  c.connections.push({ ...c.connections[3], id: "six" });
  assert.throws(() => mergeConfig(c, defaults), /cinco/);
});
test("la respuesta pública no contiene tokens ni strings y un guardado vacío los conserva", () => {
  const old = structuredClone(defaults);
  old.connections.push({
    id: "db",
    name: "DB",
    kind: "database",
    endpoint: "postgresql://user:private@example.com/db",
    secret: "secret-value",
    enabled: true,
    status: "ready",
  });
  const pub = publicConfig(old);
  assert.ok(!JSON.stringify(pub).includes("private"));
  assert.ok(!JSON.stringify(pub).includes("secret-value"));
  const merged = mergeConfig(pub, old);
  assert.equal(merged.connections[3].endpoint, old.connections[3].endpoint);
  assert.equal(merged.connections[3].secret, "secret-value");
  assert.equal(merged.connections[3].status, "ready");
});
test("identificadores duplicados y destinos inválidos se rechazan", () => {
  assert.throws(
    () =>
      mergeConfig(
        {
          ...defaults,
          connections: [defaults.connections[0], defaults.connections[0]],
        },
        defaults,
      ),
    /duplicado/,
  );
  assert.throws(
    () =>
      mergeConfig(
        {
          ...defaults,
          connections: [
            { ...defaults.connections[0], endpoint: "http://localhost/mcp" },
          ],
        },
        defaults,
      ),
    /HTTPS/,
  );
});
test("direcciones privadas, metadata y mapeos IPv6 no son destinos externos", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.18.0.1",
    "169.254.169.254",
    "192.168.0.2",
    "::1",
    "fd00::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(privateAddress(ip), true, ip);
  assert.equal(privateAddress("8.8.8.8"), false);
});

test("IPv4 públicos mapeados en IPv6 se aceptan y los privados siguen bloqueados", () => {
  assert.equal(privateAddress("::ffff:8.8.8.8"), false);
  assert.equal(privateAddress("::ffff:0808:0808"), false);
  assert.equal(privateAddress("::ffff:7f00:1"), true);
  assert.equal(privateAddress("ff00::1"), true);
});

test("cada motor usa su ruta real de inferencia sin duplicar v1", () => {
  assert.equal(
    inferenceEndpoint("mesh", "https://api.mindcontextia.one/mesh"),
    "https://api.mindcontextia.one/mesh/v1/chat/completions",
  );
  assert.equal(
    inferenceEndpoint("mesh", "https://api.mindcontextia.one/mesh/v1/"),
    "https://api.mindcontextia.one/mesh/v1/chat/completions",
  );
  assert.equal(
    inferenceEndpoint("cerebras", "https://api.cerebras.ai/v1/"),
    "https://api.cerebras.ai/v1/chat/completions",
  );
});

test("clasificación de repositorios persiste y rechaza funciones desconocidas", () => {
  const config = structuredClone(defaults);
  config.connections.push({
    id: "repo",
    name: "Componentes",
    kind: "repository",
    endpoint: "https://github.com/turbillon50/skills-vault",
    enabled: true,
    status: "pending",
    purpose: "components",
  });
  assert.equal(
    mergeConfig(config, defaults).connections[3].purpose,
    "components",
  );
  assert.throws(
    () =>
      mergeConfig(
        {
          ...config,
          connections: [{ ...config.connections[3], purpose: "unknown" }],
        },
        defaults,
      ),
    /inválida/,
  );
});
test("proveedor propio exige URL HTTPS, modelo y credencial que nunca sale en público", () => {
  const input = {
    ...structuredClone(defaults),
    engine: "custom",
    model: "modelo",
    customEndpoint: "https://provider.example/v1",
    customSecret: "private-api-key",
  };
  const saved = mergeConfig(input, defaults);
  assert.equal(saved.engine, "custom");
  assert.ok(!JSON.stringify(publicConfig(saved)).includes("private-api-key"));
  const again = mergeConfig(publicConfig(saved), saved);
  assert.equal(again.customSecret, "private-api-key");
  assert.throws(
    () =>
      mergeConfig(
        { ...input, customEndpoint: "http://localhost/v1" },
        defaults,
      ),
    /HTTPS/,
  );
  assert.equal(
    inferenceEndpoint("custom", "https://provider.example/v1/chat/completions"),
    "https://provider.example/v1/chat/completions",
  );
});
