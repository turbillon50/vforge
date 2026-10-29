import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { V_ORIGIN, V_ORIGIN_MANTRAS, originIdentitySection } from "../lib/v-chat/origin-identity";

test("recovered identity preserves the original May 13 text byte for byte", () => {
  const canonical = JSON.stringify(V_ORIGIN_MANTRAS.map(m => [m.title, m.content]));
  assert.equal(createHash("sha256").update(canonical).digest("hex"), "4654c765b6b7cd09c52405b709912a229cbad227401a7c39daf52f2d9fc4bf73");
  assert.equal(V_ORIGIN_MANTRAS.length, 4);
});

test("the restored core carries provenance without asserting complete memory or tools", () => {
  const section = originIdentitySection();
  assert.ok(section.includes(V_ORIGIN.commit));
  for (const mantra of V_ORIGIN_MANTRAS) assert.ok(section.includes(JSON.stringify(mantra.content)));
  assert.match(section, /no certifica que todos los días o conversaciones estén archivados/);
  assert.match(section, /configuración técnica y las herramientas disponibles/);
});


test("user-declared origin is distinct from mantra publication and import timestamps", () => {
  const section = originIdentitySection();
  assert.match(section, /Nacimiento\/origen declarado por Luis: 2026-05-02/);
  assert.match(section, /2026-05-13 corresponde a los textos de los mantras, no al nacimiento/);
  assert.match(section, /no acredita una transcripción del día original/);
});
