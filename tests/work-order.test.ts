import assert from "node:assert/strict";
import test from "node:test";
import { looksLikeWorkOrder, parseWorkOrder } from "../lib/live/work-order";
import { taskFromRun } from "../lib/live/room-tasks";

test("no dispara con conversación normal, por larga que sea", () => {
  assert.equal(looksLikeWorkOrder("hola"), false);
  assert.equal(looksLikeWorkOrder("listo"), false);
  assert.equal(
    looksLikeWorkOrder(
      "oye V, el hero de la landing se ve apretado en móvil y el contraste del nav está bajo, ¿qué opinas del espaciado?",
    ),
    false,
  );
  assert.equal(
    looksLikeWorkOrder("me late el diseño, dime qué cambiarías del composer del chat"),
    false,
  );
});

test("dispara sólo con orden explícita de mandar el trabajo", () => {
  assert.equal(looksLikeWorkOrder("mándalo a Hetzner"), true);
  assert.equal(looksLikeWorkOrder("manda esto a la fabrica"), true);
  assert.equal(looksLikeWorkOrder("encólalo, que salga el trabajo"), true);
  assert.equal(looksLikeWorkOrder("que lo haga grok en el servidor"), true);
  assert.equal(looksLikeWorkOrder("ponlo en cola por favor"), true);
});

test("hablar de Hetzner no es ordenar trabajo", () => {
  assert.equal(looksLikeWorkOrder("¿está vivo Hetzner?"), false);
  assert.equal(looksLikeWorkOrder("qué es la fabrica y para qué sirve grok"), false);
});

test("el owner elige a quién le manda el trabajo", () => {
  assert.deepEqual(parseWorkOrder("mándaselo a Claude Code"), {
    dispatch: true,
    executor: "claude",
  });
  assert.deepEqual(parseWorkOrder("que lo haga grok en el servidor"), {
    dispatch: true,
    executor: "grok",
  });
  assert.deepEqual(parseWorkOrder("encólalo con codex"), {
    dispatch: true,
    executor: "codex",
  });
  // Sin nombre de agente decide la política del repo, no el chat.
  assert.deepEqual(parseWorkOrder("mándalo a la fabrica"), {
    dispatch: true,
    executor: null,
  });
  // Nombrar a Claude no es ordenarle nada.
  assert.equal(parseWorkOrder("¿claude o grok para esto?").dispatch, false);
  assert.equal(parseWorkOrder("no lo mandes a claude todavía").dispatch, false);
  assert.equal(parseWorkOrder("¿lo mando a grok o lo vemos aquí?").dispatch, false);
  assert.equal(parseWorkOrder("¿cómo va el run a1b2c3d4?").dispatch, false);
});

test("la tira de tareas dice el estado en palabras, no en porcentajes", () => {
  const task = taskFromRun({
    id: "a1b2c3d4-0000-0000-0000-000000000000",
    project_id: "lutor",
    instruction: "arregla el hero",
    requested_executor: "claude",
    resolved_executor: "claude",
    phase: "building",
    status: "running",
    repo_full_name: "turbillon50/vforge",
    base_branch: "main",
    work_branch: "vforge/run-a1b2c3d4",
    queue_jobs: [],
    preview_url: null,
    pr_number: null,
    pr_url: null,
    summary: null,
    error: null,
    created_by_email: "luis@vforge.site",
    created_at: "2026-08-31T03:00:00Z",
    updated_at: "2026-08-31T03:05:00Z",
    approved_at: null,
    published_at: null,
  });
  assert.equal(task.shortId, "a1b2c3d4");
  assert.equal(task.agentLabel, "Claude Code");
  assert.equal(task.statusLabel, "trabajando");
  assert.equal(task.live, true);
});
