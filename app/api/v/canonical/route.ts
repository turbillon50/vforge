import { requireVOwner } from "@/lib/v-chat/auth";
import { loadConfig, saveConfig, publicConfig, mergeConfig } from "@/lib/v-canonical/config";
import { testConnection } from "@/lib/v-canonical/tools";
export const runtime="nodejs";export const maxDuration=60;
const headers={"Cache-Control":"no-store"};
export async function GET(req:Request){const access=await requireVOwner(req);if(access instanceof Response)return access;try{return Response.json(publicConfig(await loadConfig()),{headers});}catch{return Response.json({error:"No se pudo abrir la configuración de V."},{status:503,headers});}}
export async function POST(req:Request){
const access=await requireVOwner(req);if(access instanceof Response)return access;
const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return Response.json({error:"Origen inválido."},{status:403,headers});
try{const body=await req.json();const old=await loadConfig();
if(body.action==="test"){const c=old.connections.find(c=>c.id===body.id);if(!c)return Response.json({error:"Conexión no encontrada."},{status:404,headers});
try{c.detail=await testConnection(c);c.status="ready";}catch{c.status="error";c.detail="No se pudo confirmar el acceso. Revisa dirección, permisos y credencial.";}
c.checkedAt=new Date().toISOString();await saveConfig(old);return Response.json(publicConfig(old),{headers});}
const config=mergeConfig(body,old);await saveConfig(config);return Response.json(publicConfig(config),{headers});
}catch(e){return Response.json({error:e instanceof Error&&/inválid|Selecciona|Revisa|Usa |admite|demasiado|HTTPS|Nombre|Identificador/.test(e.message)?e.message:"No se pudo guardar. Verifica la configuración del servidor."},{status:400,headers});}
}
