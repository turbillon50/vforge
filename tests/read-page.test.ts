import test from "node:test";
import assert from "node:assert/strict";
import { extractReadableText } from "../lib/live/read-page";
import { formatRoomContext } from "../lib/live/room-context";
import { modeSystemRules } from "../lib/forge/ask-v-policy";

test("html pages become readable text without scripts", () => {
  const extracted = extractReadableText(`
    <html><head><title>APSUS Onboarding</title>
    <script>alert(1)</script></head>
    <body><h1>Contraste</h1><p>El CTA no se lee.</p></body></html>
  `);
  assert.equal(extracted.title, "APSUS Onboarding");
  assert.match(extracted.text, /Contraste/);
  assert.match(extracted.text, /El CTA no se lee/);
  assert.doesNotMatch(extracted.text, /alert/);
});

test("room brief includes fetched page content", () => {
  const brief = formatRoomContext({
    projectId: "apsus",
    references: [
      { label: "Onboarding", url: "https://apsus.site/onboarding", kind: "page" },
    ],
    pages: [
      {
        url: "https://apsus.site/onboarding",
        title: "Onboarding",
        text: "Paso 1: valida INE. Paso 2: deposita.",
      },
    ],
  });
  assert.match(brief, /CONTENIDO LEÍDO DE LAS URLS/);
  assert.match(brief, /valida INE/);
});

test("plan mode must write the plan from room content", () => {
  assert.match(modeSystemRules("plan"), /entrega el plan ahora/);
});
