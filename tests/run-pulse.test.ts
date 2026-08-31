import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeOrder, pulseLabel, runnerLooksDead } from "../lib/live/run-pulse";

test("detects work orders and dead grok cli", () => {
  assert.equal(looksLikeOrder("dale con todo usando grok"), true);
  assert.equal(looksLikeOrder("hola qué onda"), false);
  assert.equal(runnerLooksDead("grok_chat error: Command"), true);
  assert.equal(pulseLabel({ status: "failed", error: "grok_chat error" }).tone, "dead");
});
