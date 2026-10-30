import test from "node:test";
import assert from "node:assert/strict";
import {
  parseChart,
  chartFromRows,
  safeChartReply,
} from "../lib/v-canonical/charts";
import { redactText, redactValue } from "../lib/v-canonical/redact";
test("las gráficas usan valores de la consulta y no aceptan columnas inventadas", () => {
  const c = chartFromRows(
    [
      { agent: "V", count: "138" },
      { agent: "docs", count: 221 },
    ],
    "agent",
    "count",
    "Archivo",
    "bar",
    "Consulta real",
  );
  assert.deepEqual(c.data, [
    { label: "V", value: 138 },
    { label: "docs", value: 221 },
  ]);
  assert.throws(() =>
    chartFromRows(
      [{ agent: "V", count: 138 }],
      "agent",
      "nonexistent",
      "Archivo",
      "bar",
      "Consulta real",
    ),
  );
  assert.throws(() =>
    parseChart({ ...c, data: [{ label: "V", value: Infinity }] }),
  );
});
test("la redacción protege credenciales y conserva el marcador histórico", () => {
  const text = redactText(
    "postgresql://user:password@example.com/db y ghp_abcdefghijklmnopqrstuvwxyz123456 lumamijuvisado",
  );
  assert.ok(!text.includes("password"));
  assert.ok(!text.includes("abcdefghijklmnopqrstuvwxyz"));
  assert.ok(text.includes("lumamijuvisado"));
  assert.deepEqual(redactValue({ api_key: "private-value", rows: 3 }), {
    api_key: "[PROTEGIDO]",
    rows: 3,
  });
});

test("una gráfica real no anuncia archivos temporales inventados", () => {
  assert.equal(
    safeChartReply("Gráfica\n![barras](/tmp/artifact_2026.png)", true),
    "Gráfica",
  );
  assert.equal(safeChartReply("Respuesta normal", false), "Respuesta normal");
});
