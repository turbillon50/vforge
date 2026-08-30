import test from "node:test";
import assert from "node:assert/strict";
import {
  parseReviewAnchor,
  parseReviewBridgeHit,
  sameReviewPage,
} from "../lib/live/review-context";
import { formatBrainBrief, formatRoomContext } from "../lib/live/room-context";
import { formatDecisionLog } from "../lib/live/project-memory";
import {
  isRetryableCerebrasCause,
  usageFromCompletion,
} from "../lib/forge/cerebras-usage";
import { modeSystemRules, providersForMode } from "../lib/forge/ask-v-policy";
import { repositoryGroupLabel } from "../lib/projects/repository-groups";
import {
  canApplyRun,
  formatElapsed,
  isLiveRunStatus,
  runnerWaitCopy,
} from "../lib/live/run-console";

test("V stays on Cerebras and names itself translator", () => {
  assert.equal(providersForMode("talk")[0].provider, "cerebras");
  assert.match(modeSystemRules("talk"), /traductora/);
  assert.match(modeSystemRules("plan"), /traductora/);
});

test("Cerebras 429 is retryable and usage is parsed", () => {
  assert.equal(isRetryableCerebrasCause("rate_limit"), true);
  assert.equal(isRetryableCerebrasCause("quota"), false);
  assert.deepEqual(usageFromCompletion({ prompt_tokens: 1200, completion_tokens: 80 }), {
    promptTokens: 1200,
    completionTokens: 80,
  });
});

test("anchors ignore query strings and keep selectors", () => {
  assert.equal(
    sameReviewPage("https://apsus.site/app?x=1", "https://apsus.site/app#cta"),
    true,
  );
  assert.equal(
    sameReviewPage("https://apsus.site/app", "https://apsus.site/login"),
    false,
  );
  const hit = parseReviewBridgeHit({
    source: "vforge-review-bridge",
    type: "hit",
    version: 1,
    selector: "button.cta",
    text: "Solicitar",
    documentX: 120,
    documentY: 480,
  });
  assert.equal(hit?.selector, "button.cta");
  const anchor = parseReviewAnchor({
    viewport: "desktop",
    x: 0.2,
    y: 0.3,
    url: "https://apsus.site/app?ref=1",
    label: "CTA",
    documentX: 120,
    documentY: 480,
    selector: "button.cta",
  });
  assert.equal(anchor?.selector, "button.cta");
});

test("room brief includes repo groups and decisions", () => {
  const brief = formatRoomContext({
    projectId: "apsus",
    repositories: [
      { repo_full_name: "turbillon50/apsus-web", role: "frontend", is_primary: true },
      { repo_full_name: "turbillon50/apsus-api", role: "backend" },
    ],
    decisions: "HISTORIAL DE DECISIONES (1):\n1. [plan_to_task] contrastes CTA",
  });
  assert.match(brief, /GRUPO MULTIRREPOSITORIO/);
  assert.match(brief, /\[frontend\] turbillon50\/apsus-web · principal/);
  assert.match(brief, /plan_to_task/);
});

test("room brief surfaces marcas, visores and brain doctrine", () => {
  const brief = formatRoomContext({
    projectId: "lutor",
    references: [
      {
        label: "Aman",
        url: "https://www.aman.com",
        kind: "inspiration",
        notes: "luz cálida",
      },
    ],
    assets: [{ filename: "logo-lutor.svg" }, { filename: "brief.pdf" }],
    eyes: [
      {
        source: "visor",
        viewport: "desktop",
        url: "https://lutor.site",
        note: "home",
        created_at: "2026-08-30T17:00:00.000Z",
      },
    ],
  });
  assert.match(brief, /MARCAS Y REFERENCIAS VISUALES/);
  assert.match(brief, /Aman/);
  assert.match(brief, /ARCHIVOS VISUALES/);
  assert.match(brief, /logo-lutor\.svg/);
  assert.match(brief, /OJOS DE LA SALA/);
  assert.match(brief, /desktop/);
  const brain = formatBrainBrief({
    files: [{ title: "lutor", content: "cobranza" }],
    lessons: [],
  });
  assert.match(brain, /Claude Code en Hetzner/);
  assert.match(brain, /lutor/);
});

test("decision log and repo labels stay compact", () => {
  assert.match(
    formatDecisionLog([{ kind: "talk_to_plan", summary: "puntos del CTA" }]),
    /talk_to_plan/,
  );
  assert.equal(
    repositoryGroupLabel("turbillon50/apsus-web", "frontend", true),
    "Frontend · turbillon50/apsus-web · principal",
  );
});

test("live console wait copy is honest and timed", () => {
  assert.equal(runnerWaitCopy(1000, true), null);
  assert.match(runnerWaitCopy(1000, false) ?? "", /cola/);
  assert.match(runnerWaitCopy(30_000, false) ?? "", /no tomaron/);
  assert.equal(formatElapsed(4500), "4s");
  assert.equal(formatElapsed(125_000), "2m 05s");
  assert.equal(isLiveRunStatus("running"), true);
  assert.equal(isLiveRunStatus("published"), false);
  assert.equal(canApplyRun("awaiting_preview"), true);
  assert.equal(canApplyRun("awaiting_approval"), true);
  assert.equal(canApplyRun("running"), false);
});
