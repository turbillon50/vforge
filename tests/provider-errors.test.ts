import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyProviderText,
  isInvalidModelOutput,
  assertValidModelOutput,
  ProviderUnavailable,
  dropInvalidAssistantTurns,
} from "../lib/forge/provider-errors";
import {
  providersForMode,
  fallbackNotice,
  cerebrasModelId,
  modeSystemRules,
} from "../lib/forge/ask-v-policy";

test("weekly limit is quota, never a valid V reply", () => {
  const text = "You've hit your weekly limit · resets 2am (UTC)";
  assert.equal(classifyProviderText(text), "quota");
  assert.equal(isInvalidModelOutput(text), true);
  assert.throws(
    () => assertValidModelOutput(text, "hetzner-claude", 12),
    (err: unknown) =>
      err instanceof ProviderUnavailable &&
      err.code === "ProviderUnavailable" &&
      err.cause === "quota" &&
      err.provider === "hetzner-claude",
  );
});

test("claude exit code 1 is invalid", () => {
  const text = "STDERR: boom\nWARNING: claude terminó con código 1";
  assert.equal(classifyProviderText(text), "exit");
  assert.equal(isInvalidModelOutput(text), true);
});

test("empty, timeout, rate limit and command failed are invalid", () => {
  assert.equal(classifyProviderText("   "), "empty");
  assert.equal(classifyProviderText("provider unavailable"), "unavailable");
  assert.equal(classifyProviderText("gateway timeout"), "timeout");
  assert.equal(classifyProviderText("rate limit exceeded"), "rate_limit");
  assert.equal(classifyProviderText("usage limit reached"), "quota");
  assert.equal(classifyProviderText("command failed"), "exit");
});

test("a real greeting is valid output", () => {
  const text = "Hola. ¿En qué trabajamos hoy?";
  assert.equal(isInvalidModelOutput(text), false);
  assert.equal(assertValidModelOutput(text, "cerebras", 40), text);
});

test("talk and plan use GPT OSS then mesh then claude last", () => {
  const talk = providersForMode("talk");
  assert.deepEqual(
    talk.map((item) => item.provider),
    ["cerebras", "mesh", "hetzner-claude"],
  );
  assert.equal(talk[0].model, "gpt-oss-120b");
  assert.equal(talk[1].policy, "fast");
  assert.equal(providersForMode("execute").length, 0);
});

test("preferred claude slug does not skip own infra", () => {
  const plan = providersForMode("plan", "anthropic/claude-sonnet-4.6");
  assert.equal(plan[0].provider, "cerebras");
  assert.equal(plan[0].model, "gpt-oss-120b");
  assert.equal(cerebrasModelId("openai/gpt-oss-120b"), "gpt-oss-120b");
});

test("fallback notice is a system status, not V voice", () => {
  assert.equal(
    fallbackNotice("hetzner-claude", "cerebras"),
    "Claude no disponible; continuamos con GPT OSS",
  );
});

test("mode rules forbid git and dispatch", () => {
  assert.match(modeSystemRules("talk"), /No crees ramas/);
  assert.match(modeSystemRules("plan"), /criterios de aceptación/);
  assert.doesNotMatch(modeSystemRules("plan"), /Ejecutar ahora/);
});

test("invalid assistant replies are dropped with their user turn", () => {
  const kept = dropInvalidAssistantTurns([
    { id: "1", role: "user", mode: "talk", content: "hola" },
    {
      id: "2",
      role: "assistant",
      mode: "talk",
      content: "You've hit your weekly limit · resets 2am (UTC)",
    },
    { id: "3", role: "user", mode: "talk", content: "seguimos" },
    { id: "4", role: "assistant", mode: "talk", content: "Claro, dime." },
  ]);
  assert.deepEqual(
    kept.map((row) => row.id),
    ["3", "4"],
  );
});
