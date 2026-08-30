import test from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { extractArchiveText } from "../lib/live/archive-text";

test("extractArchiveText reads textual WhatsApp exports and ignores media", () => {
  const archive = zipSync({
    "Chat de WhatsApp.txt": strToU8("[10:00] Cliente: Me interesa el proyecto"),
    "notas.md": strToU8("# Acuerdos\nEntrega en septiembre"),
    "IMG-001.jpg": new Uint8Array([1, 2, 3, 4]),
  });
  const text = extractArchiveText(archive);
  assert.match(text, /Me interesa el proyecto/);
  assert.match(text, /Entrega en septiembre/);
  assert.doesNotMatch(text, /IMG-001/);
});

test("extractArchiveText returns empty when the ZIP has no readable text", () => {
  assert.equal(extractArchiveText(zipSync({ "foto.jpg": new Uint8Array([1, 2]) })), "");
});
