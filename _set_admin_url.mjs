import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
const env = readFileSync("/root/vforge/.env.production.local", "utf8");
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.log("NO_DB"); process.exit(1); }
const url = m[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);
const after = await sql`UPDATE projects SET admin_url = ${"https://admin.netmas.site/?vf=nmvf_7Kq9pL2wR8tX4nM1bC6hY3sQ"} WHERE id = ${"netmas-distribuidores"} RETURNING id, admin_url`;
console.log(JSON.stringify(after));
