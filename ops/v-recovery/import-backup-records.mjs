import fs from "node:fs";import {neon} from "@neondatabase/serverless";
const sql=neon(process.env.DATABASE_URL);const input=process.argv[2];if(!input)throw Error("Input required");
const statements=fs.readFileSync(new URL("../../migrations/20261030_v_recovery_archive.sql",import.meta.url),"utf8").split(";").map(s=>s.trim()).filter(Boolean);
for(const statement of statements)await sql.query(statement);
const records=fs.readFileSync(input,"utf8").trim().split("\n").filter(Boolean).map(l=>JSON.parse(l));
for(const r of records){if(!/^[a-f0-9]{64}$/.test(r.id)||typeof r.content!=="string"||r.content.length>500000||!Array.isArray(r.source_files))throw Error("Invalid record");
await sql.query(`INSERT INTO v_recovery_archive(id,source_table,original_id,source_time,author,title,content,original_sha256,redacted,source_files)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
ON CONFLICT(id) DO UPDATE SET source_files=(SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements(v_recovery_archive.source_files || excluded.source_files))`,[r.id,r.source_table,r.original_id,r.source_time,r.author,r.title,r.content,r.original_sha256,r.redacted,JSON.stringify(r.source_files)]);}
console.log(JSON.stringify(await sql.query("SELECT source_table,count(*)::int AS records,min(source_time)::text AS first,max(source_time)::text AS last FROM v_recovery_archive GROUP BY source_table")));
