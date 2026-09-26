import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
const env = readFileSync("/etc/vforge/vforge-api.env", "utf8");
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.log("NO_DB"); process.exit(1); }
const url = m[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);
const before = await sql`SELECT id, desktop_url, mobile_url, admin_url, vercel_url, domain FROM projects WHERE id = ${"icep-control"}`;
console.log("BEFORE", JSON.stringify(before));
const after = await sql`UPDATE projects SET desktop_url = ${"https://icep-control.vercel.app"}, mobile_url = ${"https://icep-control.vercel.app"}, vercel_url = ${"https://icep-control.vercel.app"}, domain = ${"icep-control.vercel.app"}, admin_url = ${"https://icep-control.vercel.app/?vista=panel"} WHERE id = ${"icep-control"} RETURNING id, desktop_url, mobile_url, admin_url, vercel_url, domain`;
console.log("AFTER", JSON.stringify(after));
try { const docs = await sql`SELECT left(content, 12000) AS content FROM project_context_documents WHERE project_id = ${"icep-control"}`; console.log("DOCS", JSON.stringify(docs).slice(0,15000)); } catch (e) { console.log("DOCS_ERR", String(e)); }
try { const assets = await sql`SELECT id, filename, content_type, size FROM project_context_assets WHERE project_id = ${"icep-control"}`; console.log("ASSETS", JSON.stringify(assets)); } catch (e) { console.log("ASSETS_ERR", String(e)); }
