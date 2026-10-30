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

test("credenciales JSON y variables de entorno históricas quedan protegidas", () => {
  const sample =
    '{"secret":"private-secret-value"}\nVULCANO_TOKEN="private-token-value"\nMCP_KEY=another-private-key';
  const safe = redactText(sample);
  assert.ok(!safe.includes("private-secret-value"));
  assert.ok(!safe.includes("private-token-value"));
  assert.ok(!safe.includes("another-private-key"));
});

test("la redacción repetida no altera los marcadores ya protegidos", () => {
  const first = redactText('{"secret":"private-secret-value"}');
  assert.equal(redactText(first), first);
});

test("gráfica de respaldos consulta los datos reales aunque el modelo omita inventariar", async () => {
  const { recoveryChartSource } = await import("../lib/v-canonical/microtasks");
  const evidence = new Map();
  let calls = 0;
  const load = async () => {
    calls++;
    return {
      recovered: [
        { source: "memory", records: 138 },
        { source: "brain_files", records: 221 },
      ],
    };
  };
  const source = await recoveryChartSource(
    "Grafica los respaldos recuperados",
    evidence,
    load,
  );
  assert.equal(calls, 1);
  assert.deepEqual(source?.rows, [
    { source: "memory", records: 138 },
    { source: "brain_files", records: 221 },
  ]);
  await recoveryChartSource("respaldos", evidence, load);
  assert.equal(calls, 1);
  assert.equal(
    await recoveryChartSource("temperatura", new Map(), load),
    undefined,
  );
  assert.equal(calls, 1);
});
