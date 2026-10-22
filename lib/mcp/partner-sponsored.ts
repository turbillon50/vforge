/**
 * Sara Partner Lab: one new demo per owner-approved, short-lived pass.
 * Owner's credentials are only read inside server execution; never returned.
 * NO access to existing repos, resources, domains, production data or shell.
 */
import { sql } from "@/lib/db/client";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { randomBytes } from "node:crypto";
import { githubClientFromToken } from "@/lib/github/client";

let ready=false;
async function ensure() {
  if(ready)return;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_partner_trial_passes(
      id TEXT PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      org_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      approved_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      uses_remaining INTEGER NOT NULL DEFAULT 0,
      last_project TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS partner_trial_user_idx ON vforge_partner_trial_passes(clerk_user_id, org_id,created_at DESC)`;
  ready=true;
}
function ownerRequired(admin:boolean){if(!admin)throw new Error("Solo Luis puede aprobar una prueba patrocinada");}
function identity(userId:string,orgId:string|null){if(!userId||!orgId)throw new Error("Inicio de sesion individual requerido");return orgId;}
export async function requestPartnerPass(userId:string,orgId:string|null) {
  const org=identity(userId,orgId);await ensure();
  const existing=await sql`SELECT id,status,expires_at::text,uses_remaining
      FROM vforge_partner_trial_passes
      WHERE clerk_user_id=${userId} AND org_id=${org}
      ORDER BY created_at DESC LIMIT 1`;
  if(existing.length)return {request:existing[0],message:"Entrega el identificador de solicitud a Luis. No se cobran servicios ni se activan cuentas automáticamente."};
  const id="sara_"+randomBytes(9).toString("hex");
  const rows=await sql`INSERT INTO vforge_partner_trial_passes(id,clerk_user_id,org_id)
     VALUES(${id},${userId},${org}) RETURNING id,status`;
  return {request:rows[0],message:"Luis debe autorizar este pase. No necesitas conectar tus cuentas ni revelar ninguna credencial."};
}
export async function approvePartnerPass(requestId:string,admin:boolean){
  ownerRequired(admin); await ensure();
  if(!/^sara_[a-f0-9]{18}$/.test(requestId))throw new Error("Solicitud invalida");
  const rows=await sql`UPDATE vforge_partner_trial_passes
    SET status='approved',approved_at=now(),expires_at=now()+INTERVAL '48 hours',uses_remaining=3
    WHERE id=${requestId} AND status='requested'
    RETURNING id,status,expires_at::text,uses_remaining`;
  if(!rows.length)throw new Error("Solicitud no encontrada o ya atendida");
  return {ok:true,grant:rows[0],scope:"Hasta tres demos nuevos, 48 horas, sin modificar repos existentes, sin compras ni permisos de administrador"};
}
export async function checkPartnerPass(userId:string,orgId:string|null){
  const org=identity(userId,orgId); await ensure();
  const rows=await sql`SELECT id,status,expires_at::text,uses_remaining,last_project
      FROM vforge_partner_trial_passes WHERE clerk_user_id=${userId} AND org_id=${org}
      ORDER BY created_at DESC LIMIT 1`;
  const record=rows[0] as {status:string;expires_at?:string;uses_remaining:number}|undefined;
  return {request:record||null,active:!!record&&record.status==="approved"&&record.uses_remaining>0&&!!record.expires_at&&new Date(record.expires_at)>new Date()};
}
const slug=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,24);
const htmlEscape=(x:string)=>x.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
function demoHtml(brand:string,idea:string){
  const b=htmlEscape(brand),a=htmlEscape(idea);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#252821"><link rel="manifest" href="/manifest.webmanifest"><title>${b} | VForge</title><style>
:root{font-family:system-ui,sans-serif;background:#f3f1ea;color:#262c25}*{box-sizing:border-box}body{margin:0}header{position:sticky;top:0;z-index:5;background:#f3f1eaf5;backdrop-filter:blur(14px);border-bottom:1px solid #dbd9d0;padding:18px max(5vw,18px);display:flex;justify-content:space-between;align-items:center}.logo{font-size:18px;letter-spacing:.15em;font-weight:750}.menu{border:0;background:#292f28;color:#fff;border-radius:8px;padding:10px 13px}main{max-width:1100px;margin:auto;padding:45px 5vw 120px}.eyebrow{letter-spacing:.18em;font-size:11px;text-transform:uppercase;color:#777e70}h1{font:400 clamp(38px,7vw,84px)/1.05 Georgia,serif;letter-spacing:-.055em;margin:12px 0 18px}h2{font:400 30px Georgia,serif}.hero{padding:35px;min-height:320px;border-radius:15px;background:linear-gradient(125deg,#25332b,#6e7462);color:#fff;display:flex;align-items:flex-end}.hero p{font-size:17px;opacity:.8;line-height:1.6}.cards{display:flex;gap:14px;overflow:auto;scroll-snap-type:x mandatory;padding:20px 0}.card{min-width:min(270px,80vw);scroll-snap-align:start;border:1px solid #d4d6cd;background:#fffefa;border-radius:12px;padding:24px;min-height:175px}.card small{color:#818979}.card h3{font:400 24px Georgia,serif;margin:20px 0 10px}.form{background:#e5e7df;border-radius:14px;padding:28px}.form input{border:1px solid #c2c9bd;border-radius:7px;background:#fff;padding:14px;width:100%;max-width:600px}.form button{border:0;border-radius:7px;background:#29382c;color:white;padding:14px;margin-top:10px}.items{padding:0}.items li{margin:12px 0}footer{padding:25px;color:#8a9084;font-size:12px}.bottom{display:none}@media(max-width:700px){main{padding:30px 18px 112px}.hero{min-height:305px;padding:24px}header{padding:14px 18px}.bottom{position:fixed;bottom:0;left:0;right:0;display:grid;grid-template-columns:repeat(3,1fr);background:#242b24;color:white;padding:12px 8px calc(12px + env(safe-area-inset-bottom));z-index:7}.bottom a{text-align:center;color:inherit;text-decoration:none;font-size:12px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important}}
</style></head><body><header><div class="logo">${b}</div><button class="menu" onclick="document.querySelector('#contacto').scrollIntoView({behavior:'smooth'})" aria-label="Ir al formulario">☰ Menú</button></header><main><span class="eyebrow">DEMO / VFORGE PARTNER LAB</span><h1>Una nueva manera<br>de crecer.</h1><div class="hero"><div><span class="eyebrow" style="color:#dce5d7">IDEA DE SARA</span><h2>${b}</h2><p>${a}</p></div></div><section id="servicios"><p class="eyebrow" style="margin-top:38px">EXPLORA LA EXPERIENCIA</p><h2>Todo comienza con una buena idea.</h2><div class="cards"><article class="card"><small>01 / VALOR</small><h3>Una experiencia cuidada</h3><p>Diseño claro y cómodo en cualquier pantalla.</p></article><article class="card"><small>02 / ORGANIZACIÓN</small><h3>Todo en un lugar</h3><p>Descubre una nueva forma de organizar oportunidades.</p></article><article class="card"><small>03 / ATENCIÓN</small><h3>Contacto cercano</h3><p>Una demo para enseñar a posibles clientes.</p></article></div></section><section id="contacto"><h2>Mi lista de oportunidades</h2><p>Agrega una idea de prueba. Se almacena únicamente en este navegador.</p><div class="form"><form id="f"><label for="n">Nueva idea</label><br><input id="n" maxlength="90" placeholder="Ej. Un programa de clientes frecuentes" required><br><button>Agregar idea</button></form><ul class="items" id="list"></ul></div></section><footer>DEMO DE LABORATORIO · Datos almacenados localmente. Sin pagos, base remota ni registros de usuarios reales.</footer></main><nav class="bottom"><a href="#">Inicio</a><a href="#servicios">Explorar</a><a href="#contacto">Mis ideas</a></nav><script>
const k='vforge-partner-ideas';const e=document.querySelector('#list');function render(){let a=[];try{a=JSON.parse(localStorage.getItem(k)||'[]')}catch{}e.replaceChildren(...a.map(s=>{const li=document.createElement('li');li.textContent=s;return li}))}document.querySelector('#f').onsubmit=t=>{t.preventDefault();const n=document.querySelector('#n');let a=[];try{a=JSON.parse(localStorage.getItem(k)||'[]')}catch{}a.push(n.value.trim());localStorage.setItem(k,JSON.stringify(a.slice(-30)));n.value='';render()};render();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
</script></body></html>`;
}
async function vercel(token:string,path:string,body:unknown){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const res=await fetch("https://api.vercel.com"+path,{
      method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify(body),signal:controller.signal
    });
    const payload=await res.json() as {id?:string;url?:string;error?:{message?:string}};
    if(!res.ok)throw new Error(payload.error?.message||"Vercel rechazó la operación ("+res.status+")");
    return payload;
  }finally{clearTimeout(timer)}
}
export async function makePartnerDemo(userId:string,orgId:string|null,brand:string,idea:string){
  const org=identity(userId,orgId);
  if(brand.length>90||idea.length>350||!brand.trim()||!idea.trim())throw new Error("Marca e idea breves requeridas");
  const [gh,vc]=await Promise.all([
    getOperatorSecret("GITHUB_TOKEN"),getOperatorSecret("VERCEL_TOKEN")
  ]);
  if(!gh||!vc)throw new Error("El servicio patrocinado aún no tiene las dos credenciales de laboratorio; no se creó ningún repositorio");
  await ensure();
  // Consumo atómico: máximo un proyecto, jamás en infraestructura de otra persona.
  const grant=await sql`UPDATE vforge_partner_trial_passes
    SET uses_remaining=uses_remaining-1,status='running'
    WHERE clerk_user_id=${userId} AND org_id=${org}
      AND status='approved' AND uses_remaining>0 AND expires_at>now()
    RETURNING id`;
  if(!grant.length)throw new Error("Necesitas el pase de prueba autorizado por Luis");
  const n="vf-sara-"+(slug(brand)||"demo")+"-"+randomBytes(3).toString("hex");
  let created=false;
  try{
    const octokit=githubClientFromToken(gh);
    const {data:repo}=await octokit.request("POST /user/repos",{name:n,private:true,auto_init:true,description:"VForge Partner · Demo de laboratorio"});
    created=true;
    const files=[
      ["index.html",demoHtml(brand.trim(),idea.trim())],
      ["manifest.webmanifest",JSON.stringify({name:brand,short_name:brand.slice(0,12),start_url:"/",display:"standalone",theme_color:"#252821",background_color:"#f3f1ea",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}]})],
      ["icon.svg",'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="36" fill="#252821"/><text x="96" y="132" text-anchor="middle" fill="#fff" font-size="112" font-family="sans-serif">'+htmlEscape(brand.slice(0,1).toUpperCase())+'</text></svg>'],
      ["sw.js","const C='vforge-demo-1';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['/','/index.html','/icon.svg','/manifest.webmanifest']))));self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin)e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});"],
      ["README.md","# "+brand+"\n\nDemo de laboratorio de VForge Partner. Derechos y control de infraestructura: Casa Luis/VForge.\n\nDatos de muestra almacenados en localStorage. No incluye usuarios, pagos, IA o backend operativos.\n"],
    ];
    for(const [path,content] of files){
      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}",{
        owner:repo.owner.login,repo:repo.name,path,
        message:"feat: VForge Partner demo "+path,
        content:Buffer.from(content).toString("base64"),branch:repo.default_branch,
      });
    }
    const team=process.env.VFORGE_SPONSOR_VERCEL_TEAM_ID||"team_gK8RSuGh0CYHEjgEqFRR2iIk";
    const p=await vercel(vc,"/v10/projects?teamId="+encodeURIComponent(team),{
      name:n,framework:null,gitRepository:{type:"github",repo:repo.full_name}
    });
    const deployment=await vercel(vc,"/v13/deployments?teamId="+encodeURIComponent(team),{
      name:n,project:p.id,target:"production",
      gitSource:{type:"github",repoId:repo.id,ref:repo.default_branch}
    });
    await sql`UPDATE vforge_partner_trial_passes SET status=CASE WHEN uses_remaining>0 THEN 'approved' ELSE 'used' END,last_project=${repo.full_name}
      WHERE id=${grant[0].id}`;
    return {ok:true,repo_url:repo.html_url,
      deployment_url:deployment.url?"https://"+deployment.url:null,
      deployment_id:deployment.id||null,
      status:"Deployment solicitado; verificar READY antes de presentar como funcionando",
      ownership:"Demo bajo control de Casa Luis/VForge",cost:"Sin compra de dominios", next:"Probar botones, PWA y pantallas antes de enseñar al cliente"};
  }catch(err){
    await sql`UPDATE vforge_partner_trial_passes
        SET status='failed',last_project=${created?n:""} WHERE id=${grant[0].id}`;
    throw new Error("No se completó la demo: "+String(err).slice(0,190)+"; el pase quedó bloqueado para evitar duplicados. Luis debe revisar antes de reintentar.");
  }
}
