import test from "node:test";
import assert from "node:assert/strict";
import {
  formatRoomContext,
  isSystemComment,
} from "../lib/live/room-context";
import { modeSystemRules } from "../lib/forge/ask-v-policy";

test("system comments are not observations", () => {
  assert.equal(
    isSystemComment({ body: "✓ Tarea creada", author_name: "Sistema" }),
    true,
  );
  assert.equal(
    isSystemComment({ body: "El CTA se ve chico y el contraste falla" }),
    false,
  );
});

test("room brief surfaces observations, reference urls and content", () => {
  const brief = formatRoomContext({
    projectId: "apsus",
    project: {
      name: "APSUS — Microcréditos",
      status: "live",
      domain: "apsus.site",
      vercel_url: "https://apsus.vercel.app",
    },
    comments: [
      {
        author_name: "Luis",
        body: "Este botón no se lee",
        created_at: "2026-08-30T18:00:00.000Z",
        anchor: {
          viewport: "desktop",
          x: 0.4,
          y: 0.2,
          url: "https://apsus.site/app",
          label: "CTA principal",
        },
      },
      { author_name: "Sistema", body: "✓ Tarea aceptada" },
    ],
    references: [
      {
        kind: "page",
        label: "Onboarding",
        url: "https://apsus.site/onboarding",
        notes: "flujo que duele",
      },
    ],
    document: "Prioridad: contrastes y onboarding APSUS.",
    assets: [{ filename: "brief.pdf" }],
  });

  assert.match(brief, /OBSERVACIONES \/ PUNTOS MARCADOS \(1/);
  assert.match(brief, /Este botón no se lee/);
  assert.match(brief, /https:\/\/apsus\.site\/app/);
  assert.doesNotMatch(brief, /Tarea aceptada/);
  assert.match(brief, /Onboarding: https:\/\/apsus\.site\/onboarding/);
  assert.match(brief, /CONTENIDO\.md DE LA SALA/);
  assert.match(brief, /contrastes y onboarding/);
  assert.match(brief, /brief\.pdf/);
  assert.match(brief, /no pidas que te lo reescriba/i);
  assert.match(brief, /toda app debe tener su MCP/i);
  assert.match(brief, /No uses n8n/i);
});

test("empty room still tells V there is nothing yet", () => {
  const brief = formatRoomContext({ projectId: "apsus" });
  assert.match(brief, /OBSERVACIONES: ninguna todavía/);
  assert.match(brief, /REFERENCIAS: ninguna todavía/);
  assert.match(brief, /MCP/);
});

test("talk and plan must read the room", () => {
  assert.match(modeSystemRules("talk"), /observaciones/);
  assert.match(modeSystemRules("plan"), /observaciones/);
  assert.match(modeSystemRules("talk"), /MCP/);
  assert.match(modeSystemRules("plan"), /n8n/);
});

test("room brief includes WhatsApp conversation text", () => {
  const brief = formatRoomContext({
    projectId: "netmas-distribuidores",
    archives: [
      {
        filename: "Chat de WhatsApp.zip",
        text: "[10:00] Cliente: Quiero el paquete NET+",
      },
    ],
  });
  assert.match(brief, /CONVERSACIONES CARGADAS/);
  assert.match(brief, /paquete NET\+/);
});
