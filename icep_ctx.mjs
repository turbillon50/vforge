import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
const env = readFileSync("/etc/vforge/vforge-api.env", "utf8");
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.log("NO_DB"); process.exit(1); }
const url = m[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);
const cols = await sql;
console.log("ASSET_COLS", cols.map(c=>c.column_name).join(","));
const assets = await sql.catch(async(e)=>{ console.log("ASSETS_ERR", String(e).slice(0,300)); const cols2 = await sql; console.log("COLS2", cols2.map(c=>c.column_name).join(",")); return []; });
console.log("ASSETS", JSON.stringify(assets).slice(0,8000));
