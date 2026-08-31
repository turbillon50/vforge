import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentPrompt, isPingInstruction } from "../lib/live/agent-prompt";

test("ping no envuelve obra", () => {
  assert.equal(isPingInstruction("di listo"), true);
  assert.equal(isPingInstruction("haz LUTOR con vibe neon"), false);
  const ping = buildAgentPrompt({
    runId: "x",
    projectId: "lutor",
    repo: "turbillon50/lutor",
    baseBranch: "main",
    workBranch: "vforge/run-x",
    instruction: "di listo",
    role: "builder",
  });
  assert.equal(ping.includes("VFORGE RUN"), false);
  assert.equal(ping.includes("No clones repo"), true);
  const obra = buildAgentPrompt({
    runId: "x",
    projectId: "lutor",
    repo: "turbillon50/lutor",
    baseBranch: "main",
    workBranch: "vforge/run-x",
    instruction: "cambia el hero a neon",
    role: "builder",
  });
  assert.equal(obra.includes("VFORGE RUN"), true);
});
