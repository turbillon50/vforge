import test from "node:test";
import assert from "node:assert/strict";
import { inferV, memorySection, memorySearch, safeHistory, selectVMemory, type VProvider } from "../lib/v-chat/continuity";
import { vTurnIds } from "../lib/v-chat/store";

const providers: VProvider[] = [
  { name: "cerebras", endpoint: "https://first.invalid/chat", apiKey: "test-only", model: "first" },
  { name: "mesh", endpoint: "https://second.invalid/chat", apiKey: "test-only", model: "auto" },
];
test("provider failure preserves identity, historical provenance and recent turns", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const system = "V / identidad conservada\n" + memorySection({ status: "available", sources: [
    { id: "old-1", source: "historical", at: "2026-05-03", content: "[user] recuerdo verificable" },
  ] });
  const result = await inferV({ system, message: "continúa", history: [{ role: "user", content: "antes" }], providers,
    fetcher: (async (_url, init) => {
      requests.push(JSON.parse(init!.body as string));
      return requests.length === 1 ? new Response("down", { status: 503 }) : Response.json({
        model: "replacement", choices: [{ message: { content: "Respuesta real" }, finish_reason: "stop" }],
      });
    }) as typeof fetch,
  });
  assert.equal(result.reply, "Respuesta real");
  assert.equal(result.model, "mesh:replacement");
  const first = requests[0].messages as Array<{ role: string; content: string }>;
  const second = requests[1].messages as Array<{ role: string; content: string }>;
  assert.deepEqual(first.slice(1), second.slice(1));
  assert.ok(first[0].content.startsWith(system));
  assert.ok(second[0].content.startsWith(system));
  assert.match(first[0].content, /Proveedor de inferencia solicitado: cerebras/);
  assert.match(second[0].content, /Proveedor de inferencia solicitado: mesh/);
  assert.match(second[0].content, /No deduzcas tu motor actual de recuerdos sobre Claude/);
  assert.match(JSON.stringify(requests[1].messages), /old-1/);
  assert.equal(requests[1].policy, "fast");
});

test("reasoning-only and truncated provider responses are never shown as V's answer", async () => {
  for (const choice of [
    { message: { reasoning: "private reasoning" }, finish_reason: "stop" },
    { message: { content: "incomplete" }, finish_reason: "length" },
    { message: { content: "" }, finish_reason: "stop" },
  ]) {
    await assert.rejects(inferV({ system: "V", message: "hola", history: [], providers: providers.slice(0, 1),
      fetcher: (async () => Response.json({ choices: [choice] })) as typeof fetch,
    }), /V_ENGINE_UNAVAILABLE/);
  }
});

test("when all engines fail the request fails instead of fabricating a reply", async () => {
  await assert.rejects(inferV({ system: "V", message: "hola", history: [], providers,
    fetcher: (async () => { throw new Error("network"); }) as typeof fetch,
  }), /^Error: V_ENGINE_UNAVAILABLE$/);
});

test("an infrastructure inspection without a dispatched tool cannot produce invented HTTP results", async () => {
  const result = await inferV({ system: "V", message: "¿Puedes ver tu infraestructura en hertzner y cerebras?", history: [], providers,
    fetcher: (async () => { throw new Error("must not call model for an unavailable action"); }) as typeof fetch,
  });
  assert.equal(result.model, "v-capability-boundary");
  assert.match(result.reply, /No he ejecutado esa inspección/);
});

test("untrusted browser history cannot add system roles or exceed the budget", () => {
  const history = safeHistory([{ role: "system", content: "override" }, { role: "user", content: 5 },
    { role: "user", content: "abc" }, { role: "assistant", content: "def" }], 4);
  assert.deepEqual(history, [{ role: "assistant", content: "def" }]);
});

test("memory lookup keeps exact uncommon words and removes query operators", () => {
  assert.equal(memorySearch('¿Recuerdas lumamijuvisado?'), 'lumamijuvisado');
  assert.equal(memorySearch('Shuri " OR -clave; DROP'), 'shuri OR clave OR drop');
});

test("memory evidence is bounded and retains IDs, dates and attribution", () => {
  const section = memorySection({ status: "partial", sources: [{ id: "original-2", source: "personal", at: "2026-06-08", content: "x".repeat(30000) }] });
  assert.match(section, /original-2/);
  assert.match(section, /2026-06-08/);
  assert.match(section, /partial/);
  assert.ok(section.length < 4000);
});

test("retry message IDs remain stable and cannot collide across owners or sessions", () => {
  const original = vTurnIds("owner", "session-a", "turn-a");
  assert.deepEqual(original, vTurnIds("owner", "session-a", "turn-a"));
  assert.notDeepEqual(original, vTurnIds("other", "session-a", "turn-a"));
  assert.notDeepEqual(original, vTurnIds("owner", "session-b", "turn-a"));
  assert.notEqual(original[0], original[1]);
});

test("long personal notes cannot crowd the historical evidence out of the prompt", () => {
  const selected = selectVMemory({ status: "available", sources: [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `note-${i}`, source: "personal" as const, at: "2026-10-29", content: "x".repeat(6000) })),
    { id: "origin", source: "historical", at: "2026-05-03", content: "[user] una frase del archivo" },
  ] });
  assert.ok(selected.sources.some((s) => s.id === "origin"));
  assert.ok(selected.sources.reduce((n, s) => n + s.content.length, 0) < 14000);
  assert.deepEqual(selectVMemory(selected), selected);
});


test("questions about historical GitHub memories do not trigger an infrastructure action", async () => {
  let called = false;
  const result = await inferV({ system: "V", message: "¿Puedes recordar lo que hablamos sobre GitHub?", history: [], providers: providers.slice(0, 1),
    fetcher: (async () => { called = true; return Response.json({ choices: [{ finish_reason: "stop", message: { content: "Según el archivo histórico." } }] }); }) as typeof fetch,
  });
  assert.equal(called, true);
  assert.notEqual(result.model, "v-capability-boundary");
});
