import test from "node:test";
import assert from "node:assert/strict";
import { parseRequestedExecutors } from "../lib/live/executors";

test("picks one or two factory executors", () => {
  assert.deepEqual(parseRequestedExecutors("grok"), ["grok"]);
  assert.deepEqual(parseRequestedExecutors(["claude", "codex"]), ["claude", "codex"]);
  assert.deepEqual(parseRequestedExecutors(["grok", "cursor", "codex"]), ["grok", "cursor"]);
  assert.deepEqual(parseRequestedExecutors("claude-code"), ["claude"]);
  assert.deepEqual(parseRequestedExecutors([]), ["grok"]);
});
