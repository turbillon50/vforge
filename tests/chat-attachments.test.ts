import test from "node:test";
import assert from "node:assert/strict";
import { parseChatAttachments } from "../lib/live/chat-attachments";
import { pickExpedienteFrames } from "../lib/live/expediente-vision";

test("parses png attachments and ignores junk", () => {
  const parsed = parseChatAttachments([
    { name: "home.png", mime: "image/png", data: "data:image/png;base64,aaa" },
    { name: "x.pdf", mime: "application/pdf", data: "xxx" },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "home.png");
});

test("attached photos beat visor frames", () => {
  const frames = pickExpedienteFrames(
    [
      { source: "visor", viewport: "desktop", mime_type: "image/png", data_b64: "aaa" },
      { source: "attach", note: "ejemplo", mime_type: "image/jpeg", data_b64: "bbb" },
    ],
    2,
  );
  assert.equal(frames[0].label.includes("attach"), true);
});
