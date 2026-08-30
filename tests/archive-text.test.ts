import test from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { extractArchiveText } from "../lib/live/archive-text";
import { isAcceptedZip } from "../lib/live/review-context";

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

test("extractArchiveText keeps the chat when the ZIP is full of photos", () => {
  const entries: Record<string, Uint8Array> = {
    "_chat.txt": strToU8("[10:00] Cliente: Quiero el paquete NET+"),
  };
  for (let index = 0; index < 250; index += 1) {
    entries[`IMG-${index}.jpg`] = new Uint8Array([1, 2, 3, 4]);
  }
  const text = extractArchiveText(zipSync(entries));
  assert.match(text, /paquete NET\+/);
});

test("extractArchiveText returns empty when the ZIP has no readable text", () => {
  assert.equal(extractArchiveText(zipSync({ "foto.jpg": new Uint8Array([1, 2]) })), "");
});

test("empty content-type still accepts a .zip name", () => {
  assert.equal(isAcceptedZip("Chat de WhatsApp.zip", "", 2048), true);
  assert.equal(isAcceptedZip("chat.zip", "application/x-zip", 2048), true);
});
