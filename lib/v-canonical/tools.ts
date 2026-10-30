import { Client } from "pg";
import { remoteFetch, boundedText, publicHost } from "./network";
import type { Connection } from "./config";
export interface RemoteTool {name:string;description?:string;inputSchema?:Record<string,unknown>}
export class MCP {
session="";constructor(readonly connection:Connection){}
async rpc(method:string,params:unknown={},notification=false):Promise<any>{
const h:Record<string,string>={"Content-Type":"application/json",Accept:"application/json, text/event-stream","MCP-Protocol-Version":"2025-03-26"};
if(this.connection.secret)h.Authorization="Bearer "+this.connection.secret;if(this.session)h["Mcp-Session-Id"]=this.session;
const response=await remoteFetch(this.connection.endpoint,{method:"POST",headers:h,body:JSON.stringify({jsonrpc:"2.0",...(notification?{}:{id:crypto.randomUUID()}),method,params})});
if(!response.ok)throw Error("MCP HTTP "+response.status);
this.session=response.headers.get("Mcp-Session-Id")||this.session;if(notification||response.status===202)return {};
const text=await boundedText(response);const messages=response.headers.get("content-type")?.includes("text/event-stream")?text.split(/\r?\n/).filter(l=>l.startsWith("data:")).map(l=>{try{return JSON.parse(l.slice(5))}catch{return null}}):[JSON.parse(text)];
const data=messages.find(x=>x&&("result" in x||"error" in x));if(!data||data.error)throw Error("El MCP rechazó la operación.");return data.result;
}
async start(){await this.rpc("initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"v-canonica",version:"1.0"}});await this.rpc("notifications/initialized",{},true);}
async list():Promise<RemoteTool[]>{let out:RemoteTool[]=[];let cursor:string|undefined;for(let i=0;i<5;i++){const x=await this.rpc("tools/list",cursor?{cursor}:{});out.push(...(x.tools||[]));cursor=x.nextCursor;if(!cursor)break;}return out.slice(0,160);}
async close(){if(!this.session)return;const h:Record<string,string>={"Mcp-Session-Id":this.session};if(this.connection.secret)h.Authorization="Bearer "+this.connection.secret;await remoteFetch(this.connection.endpoint,{method:"DELETE",headers:h}).catch(()=>{});}
}
export async function databaseRead(c:Connection,sql="SELECT current_database() AS database, current_timestamp AS checked_at"){
const url=new URL(c.endpoint);await publicHost(url.hostname);
if(!/^\s*SELECT\b/i.test(sql)||sql.length>8000||/;|\b(pg_sleep|pg_read_file|pg_ls_dir|dblink|lo_import|pg_terminate_backend)\b/i.test(sql))throw Error("Sólo consultas SELECT sin punto y coma.");
url.searchParams.delete("sslmode");url.searchParams.delete("sslcert");url.searchParams.delete("sslkey");url.searchParams.delete("sslrootcert");
const client=new Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000,statement_timeout:8000,query_timeout:10000,application_name:"v-canonica-readonly"});
try{await client.connect();await client.query("BEGIN READ ONLY");await client.query("SET LOCAL statement_timeout = '8s'");const r=await client.query("SELECT * FROM ("+sql+") AS v_canonical_read LIMIT 51");return {rows:r.rows.slice(0,50),returned:Math.min(r.rows.length,50),truncated:r.rows.length>50};}finally{await client.end().catch(()=>{});}
}
export async function repositoryRead(c:Connection,path="README.md"){
if(!/^[\w./-]{1,200}$/.test(path)||path.split("/").includes(".."))throw Error("Ruta inválida.");
const m=/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/.exec(c.endpoint);if(!m)throw Error("Repositorio inválido.");
const h:Record<string,string>={Accept:"application/vnd.github.raw+json","X-GitHub-Api-Version":"2022-11-28"};if(c.secret)h.Authorization="Bearer "+c.secret;
const r=await remoteFetch("https://api.github.com/repos/"+m[1]+"/"+m[2]+"/contents/"+path.split("/").map(encodeURIComponent).join("/"),{headers:h});if(!r.ok)throw Error("GitHub HTTP "+r.status);return {source:c.endpoint+"/blob/HEAD/"+path,content:(await boundedText(r,100000)).slice(0,16000)};
}
export async function testConnection(c:Connection){if(!c.endpoint)throw Error("Falta configurar la conexión.");
if(c.kind==="database"){await databaseRead(c);return "PostgreSQL respondió; lectura verificada.";}
if(c.kind==="repository"){const r=await repositoryRead(c);return "Repositorio accesible: "+r.content.length+" caracteres de README.";}
const m=new MCP(c);try{await m.start();const tools=await m.list();return tools.length+" herramientas disponibles.";}finally{await m.close();}
}
