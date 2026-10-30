import { queryAll } from "@/lib/db/client";
import { encryptOperatorSecret, decryptOperatorSecret } from "@/lib/vault/operator-crypto";
export type ConnectionKind = "mcp" | "database" | "repository";
export interface Connection { id:string; name:string; kind:ConnectionKind; endpoint:string; secret?:string; enabled:boolean; status:string; detail?:string; checkedAt?:string }
export interface CanonConfig { engine:"cerebras"|"mesh"; model:string; connections:Connection[] }
export const defaults:CanonConfig={engine:"cerebras",model:"",connections:[
{id:"vulcano",name:"Vulcano",kind:"mcp",endpoint:"https://mcp.vmomentum.site/mcp",enabled:true,status:"pending"},
{id:"vforge",name:"VForge",kind:"mcp",endpoint:"https://vforge.site/api/mcp",enabled:true,status:"pending"},
{id:"mesh",name:"Mesh",kind:"mcp",endpoint:"https://api.mindcontextia.one/mesh-mcp",enabled:true,status:"pending"}]};
async function ensure(){await queryAll(`CREATE TABLE IF NOT EXISTS v_canonical_config (id text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);}
function seal(value:string){const x=encryptOperatorSecret(value);return JSON.stringify({ciphertext:x.ciphertext.toString("base64"),iv:x.iv.toString("base64"),authTag:x.authTag.toString("base64")});}
function unseal(value:string){const x=JSON.parse(value);return decryptOperatorSecret({ciphertext:Buffer.from(x.ciphertext,"base64"),iv:Buffer.from(x.iv,"base64"),authTag:Buffer.from(x.authTag,"base64")});}
export async function loadConfig():Promise<CanonConfig>{await ensure();const rows=await queryAll<{payload:string}>("SELECT payload->>'sealed' AS payload FROM v_canonical_config WHERE id=$1",["v-canonica"]);return rows[0]?JSON.parse(unseal(rows[0].payload)):structuredClone(defaults);}
export async function saveConfig(config:CanonConfig){await ensure();await queryAll("INSERT INTO v_canonical_config(id,payload) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=now()",["v-canonica",JSON.stringify({sealed:seal(JSON.stringify(config))})]);}
export function publicConfig(config:CanonConfig){return {...config,connections:config.connections.map(c=>({...c,secret:undefined,endpoint:c.kind==="database"?"":c.endpoint,hasSecret:!!c.secret,hasEndpoint:!!c.endpoint}))};}
export function mergeConfig(input:unknown,old:CanonConfig):CanonConfig{
if(!input||typeof input!=="object")throw Error("Configuración inválida.");
const b=input as Record<string,unknown>;
if(b.engine!=="cerebras"&&b.engine!=="mesh")throw Error("Selecciona Cerebras o Mesh.");
if(typeof b.model!=="string"||b.model.length>120||!Array.isArray(b.connections)||b.connections.length>30)throw Error("Revisa las conexiones.");
const ids=new Set<string>();let databases=0;
const connections=b.connections.map((raw:unknown):Connection=>{
if(!raw||typeof raw!=="object")throw Error("Conexión inválida.");const c=raw as Record<string,unknown>;
if(typeof c.id!=="string"||! /^[a-z0-9_-]{1,64}$/.test(c.id)||ids.has(c.id))throw Error("Identificador inválido o duplicado.");ids.add(c.id);
if(!["mcp","database","repository"].includes(String(c.kind))||typeof c.name!=="string"||!c.name.trim()||c.name.length>80)throw Error("Nombre o tipo inválido.");
const prev=old.connections.find(x=>x.id===c.id&&x.kind===c.kind);
const endpoint=typeof c.endpoint==="string"&&c.endpoint.trim()?c.endpoint.trim():(prev?.endpoint||"");
const secret=typeof c.secret==="string"&&c.secret.trim()?c.secret.trim():prev?.secret;
if(endpoint.length>5000||(secret?.length||0)>10000)throw Error("Conexión demasiado larga.");
if(c.kind==="database"){databases++;if(endpoint&&!/^postgres(ql)?:\/\//.test(endpoint))throw Error("Usa una connection string PostgreSQL.");}
if(c.kind==="repository"&&endpoint&&!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(endpoint))throw Error("Usa https://github.com/owner/repo.");
if(c.kind==="mcp"&&endpoint){const u=new URL(endpoint);if(u.protocol!=="https:"||u.username||u.password)throw Error("MCP requiere HTTPS; usa el campo de token para autenticar.");}
const unchanged=prev&&prev.endpoint===endpoint&&prev.secret===secret;
return {id:c.id,name:c.name.trim(),kind:c.kind as ConnectionKind,endpoint,secret,enabled:c.enabled!==false,status:unchanged?prev.status:"pending",detail:unchanged?prev.detail:undefined,checkedAt:unchanged?prev.checkedAt:undefined};
});
if(databases>5)throw Error("V admite hasta cinco connection strings.");
return {engine:b.engine,model:b.model.trim(),connections};
}
