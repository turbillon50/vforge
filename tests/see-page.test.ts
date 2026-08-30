import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSeeHostCommand,
  extractImageBase64,
  extractPngBase64,
  isJpegBase64,
  isPngBase64,
  isSafeCaptureUrl,
  mcpSeeResult,
  parseSeeViewports,
  parseEyeImage,
  shSingleQuote,
} from "../lib/live/see-page";
import { buildCdpCurrentCommand, buildCdpNavigateCommand } from "../lib/live/see-cdp";

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

test("Navegador Pro CDP opens a new tab, screenshots, and quotes the url", () => {
  const url = "https://netmas.mx/app?x=1&y=2";
  const cmd = buildCdpNavigateCommand({ url, width: 1440, height: 900, mobile: false });
  assert.match(cmd, /docker exec -i vulcano-browser python3 -/);
  const b64 = cmd.match(/echo ([A-Za-z0-9+/=]+) /)?.[1] || "";
  const py = Buffer.from(b64, "base64").toString("utf8");
  assert.match(py, /Page.captureScreenshot/);
  assert.match(py, /json\/new/);
  assert.match(py, /json\/close/);
  assert.match(cmd, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const current = buildCdpCurrentCommand();
  assert.match(current, / python3 - current$/);
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

test("extracts JPEG from plugin captures", () => {
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(80, 2),
  ]).toString("base64");
  assert.equal(isJpegBase64(jpeg), true);
  const found = extractImageBase64(`TAB https://x\n${jpeg}`);
  assert.equal(found?.mimeType, "image/jpeg");
  assert.equal(found?.data, jpeg);
  const parsed = parseEyeImage(`data:image/jpeg;base64,${jpeg}`);
  assert.equal(parsed?.mimeType, "image/jpeg");
  assert.equal(parseEyeImage("CAPTURA de example.com HTML: <div>"), null);
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
        engine: "navegador",
      },
    ],
    failures: [],
  });
  const image = result.content.find((item) => item.type === "image");
  assert.equal(image?.mimeType, "image/png");
  assert.equal(image?.data, png);
  assert.match(String(result.content[0]?.text), /Ojos de la sala/);
  assert.match(String(result.content[0]?.text), /Navegador Pro/);
});
