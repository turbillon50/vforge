import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  validatePhotos,
  normalizePhoto,
  photoId,
} from "../lib/v-canonical/images";
test("fotos: rechaza URLs remotas, SVG, exceso de archivos y payload grande", () => {
  for (const data of [
    "https://example.com/x.jpg",
    "data:image/svg+xml;base64,AAAA",
    "data:image/jpeg;base64," + "A".repeat(1400001),
  ])
    assert.throws(() => validatePhotos([{ name: "x", data }]));
  assert.throws(() =>
    validatePhotos(
      Array(4).fill({ name: "x", data: "data:image/png;base64,AAAA" }),
    ),
  );
  assert.deepEqual(validatePhotos(undefined), []);
});
test("fotos: normaliza a JPEG pequeño sin EXIF y rechaza contenido falso", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "red" },
  })
    .withMetadata({ exif: { IFD0: { Artist: "private-location" } } })
    .png()
    .toBuffer();
  const result = await normalizePhoto(
    "data:image/png;base64," + input.toString("base64"),
  );
  const metadata = await sharp(result.data).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(
    () =>
      normalizePhoto(
        "data:image/png;base64," +
          Buffer.from("not a photo").toString("base64"),
      ),
    /V_IMAGE_INVALID/,
  );
});
test("fotos: el identificador de reintento queda ligado al hilo y envío", () => {
  assert.equal(photoId("a", "b", "c"), photoId("a", "b", "c"));
  assert.notEqual(photoId("a", "b", "c"), photoId("other", "b", "c"));
  assert.notEqual(photoId("a", "b", "c"), photoId("a", "b", "changed"));
});
