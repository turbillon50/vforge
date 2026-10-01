import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importarZipWhatsApp } from "./importar-zip.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CASES = [
  {
    fixture: "android-es.txt",
    entry: "Chat de WhatsApp con Ana/_chat.txt",
    attachment: "Chat de WhatsApp con Ana/IMG-20241231-WA0001.jpg",
    chat: "Ana",
    participants: ["Ana", "Luis"],
    firstTs: "2024-12-31T22:15:00.000Z",
    count: 4,
  },
  {
    fixture: "android-en.txt",
    entry: "WhatsApp Chat with Alex.txt",
    attachment: "WhatsApp Chat with Alex/VID-20241231-WA0001.mp4",
    chat: "Alex",
    participants: ["Alex", "Luis"],
    firstTs: "2024-12-31T22:15:00.000Z",
    count: 3,
  },
  {
    fixture: "ios-es.txt",
    entry: "Chat de WhatsApp con Asistente/_chat.txt",
    attachment: "Chat de WhatsApp con Asistente/AUDIO-2024-12-31-22-17-00.opus",
    chat: "Asistente",
    participants: ["Asistente", "Luis"],
    firstTs: "2024-12-31T22:15:00.000Z",
    count: 3,
  },
  {
    fixture: "ios-en.txt",
    entry: "WhatsApp Chat with Assistant/_chat.txt",
    attachment: "WhatsApp Chat with Assistant/Project Brief.pdf",
    chat: "Assistant",
    participants: ["Assistant", "Luis"],
    firstTs: "2024-12-31T22:15:00.000Z",
    count: 3,
  },
];

function crc32(input) {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeDosTimeDate(buffer, offset) {
  buffer.writeUInt16LE(0, offset);
  buffer.writeUInt16LE(0, offset + 2);
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const crc = crc32(data);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    writeDosTimeDate(local, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localParts.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    writeDosTimeDate(central, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);

    offset += local.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, central, eocd]);
}

async function fixtureZip(testCase) {
  const text = await readFile(path.join(__dirname, "fixtures", testCase.fixture));
  return zipStore([
    { name: testCase.entry, data: text },
    { name: testCase.attachment, data: Buffer.from("adjunto de prueba") },
  ]);
}

for (const testCase of CASES) {
  test(`importa ${testCase.fixture}`, async () => {
    const zip = await fixtureZip(testCase);
    const parsed = await importarZipWhatsApp(zip, {
      projectId: "ceer",
      filename: `${testCase.fixture}.zip`,
    });

    assert.equal(parsed.chat.chat_nombre, testCase.chat);
    assert.deepEqual(parsed.participants, testCase.participants);
    assert.equal(parsed.range.desde, testCase.firstTs);
    assert.equal(parsed.messages.length, testCase.count);
    assert.equal(parsed.messages[0].origen, "zip");
    assert.match(parsed.messages[0].uid, /^zip:[a-f0-9]{64}$/);
    assert.equal(parsed.attachments.length, 1);
    assert.equal(parsed.attachments[0].nombre, testCase.attachment);
  });
}

test("preserva mensajes multilinea y sistema", async () => {
  const zip = await fixtureZip(CASES[0]);
  const parsed = await importarZipWhatsApp(zip, { projectId: "ceer" });

  assert.match(parsed.messages[1].texto, /segunda linea/);
  assert.equal(parsed.messages[2].autor, null);
  assert.equal(parsed.messages[2].tipo, "otro");
});

test("detecta adjuntos y media omitida", async () => {
  const es = await importarZipWhatsApp(await fixtureZip(CASES[0]), { projectId: "ceer" });
  assert.equal(es.messages[3 - 1].media_ref, null);
  assert.equal(es.messages[es.messages.length - 1].media_ref, "IMG-20241231-WA0001.jpg");
  assert.equal(es.messages[es.messages.length - 1].tipo, "imagen");

  const en = await importarZipWhatsApp(await fixtureZip(CASES[1]), { projectId: "ceer" });
  assert.equal(en.messages[en.messages.length - 1].media_tipo, "media/omitted");
});

test("genera ids deterministas para reimportar el mismo ZIP", async () => {
  const zip = await fixtureZip(CASES[2]);
  const a = await importarZipWhatsApp(zip, { projectId: "ceer" });
  const b = await importarZipWhatsApp(zip, { projectId: "ceer" });
  assert.deepEqual(
    a.messages.map((message) => message.uid),
    b.messages.map((message) => message.uid),
  );
  assert.equal(a.chat.id, b.chat.id);
});
