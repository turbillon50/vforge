import { zipSync } from "fflate";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dir = path.join(process.cwd(), "public", "inspector");
  const names = await readdir(dir);
  const files: Record<string, Uint8Array> = {};
  for (const name of names) {
    if (name.startsWith(".")) continue;
    files[`vforge-inspector/${name}`] = new Uint8Array(await readFile(path.join(dir, name)));
  }
  const zipped = zipSync(files, { level: 6 });
  return new Response(Buffer.from(zipped), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="vforge-inspector.zip"',
      "Cache-Control": "no-store",
    },
  });
}
