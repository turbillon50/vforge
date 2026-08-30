import test from "node:test";
import assert from "node:assert/strict";
import { craftBrief, craftForMcp } from "../lib/live/craft-doctrine";
import { formatBrainBrief } from "../lib/live/room-context";

test("craft bible bans primaries and names the light recipe", () => {
  const text = craftBrief();
  assert.match(text, /#2563eb/);
  assert.match(text, /158deg/);
  assert.match(text, /tabbar/);
  assert.match(text, /Lucide/);
  assert.match(craftForMcp("cristal"), /luz detr/);
});

test("brain brief always carries craft", () => {
  const brief = formatBrainBrief({ files: [], lessons: [] });
  assert.match(brief, /AGENCIA PREMIUM/);
  assert.match(brief, /Claude Code en Hetzner/);
});
