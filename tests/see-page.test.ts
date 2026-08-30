import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSeeHostCommand,
  extractPngBase64,
  isPngBase64,
  isSafeCaptureUrl,
  mcpSeeResult,
  parseSeeViewports,
  shSingleQuote,
} from "../lib/live/see-page";

test("default eyes are desktop and mobile, all includes admin", () => {
  assert.deepEqual(parseSeeViewports(undefined), ["desktop", "mobile"]);
  assert.deepEqual(parseSeeViewports("desktop"), ["desktop"]);
  assert.deepEqual(parseSeeViewports("all"), ["desktop", "mobile", "admin"]);
  assert.deepEqual(parseSeeViewports(["mobile", "desktop", "mobile"]), [
    "mobile",
    "desktop",
  ]);
});

test("capture urls reject credentials and non-http", () => {
  assert.equal(isSafeCaptureUrl("https://netmas.mx/app"), true);
  assert.equal(isSafeCaptureUrl("http://localhost:3000"), true);
  assert.equal(isSafeCaptureUrl("javascript:alert(1)"), false);
  assert.equal(isSafeCaptureUrl("https://user:pass@evil.com"), false);
});

test("host command keeps the url quoted and never interpolates it raw", () => {
  const url = "https://netmas.mx/app?x=1&y=2";
  const cmd = buildSeeHostCommand({
    url,
    width: 1440,
    height: 900,
    mobile: false,
  });
  assert.match(cmd, /docker exec -i vulcano-browser bash -s --/);
  assert.match(cmd, new RegExp(shSingleQuote(url).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(cmd.includes(" user:pass"), false);
  assert.equal(cmd.includes("$(rm"), false);
});

test("png header is required before calling it an image", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(80, 1),
  ]).toString("base64");
  assert.equal(isPngBase64(png), true);
  assert.equal(isPngBase64("not-an-image"), false);
  assert.equal(isPngBase64(""), false);
});

test("extracts PNG even if the relay prepends noise", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(80, 1),
  ]).toString("base64");
  assert.equal(extractPngBase64(`ok\n${png}\n`), png);
  assert.equal(extractPngBase64("NO_SHOT"), null);
});

test("MCP result sends real image blocks, not a URL", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(80, 1),
  ]).toString("base64");
  const result = mcpSeeResult("NETMAS", "netmas-distribuidores", {
    shots: [
      {
        viewport: "desktop",
        label: "Escritorio",
        url: "https://netmas.mx",
        mimeType: "image/png",
        data: png,
      },
    ],
    failures: [],
  });
  const image = result.content.find((item) => item.type === "image");
  assert.equal(image?.mimeType, "image/png");
  assert.equal(image?.data, png);
  assert.match(String(result.content[0]?.text), /Ojos de la sala/);
});
