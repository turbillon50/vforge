import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { put } from "@vercel/blob";
import { createHash, randomBytes } from "node:crypto";
import { designPlan } from "./partner-design";

type FileItem = { kind: string; title: string; url: string };
const flat = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
   .replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7e\n]/g, " ").trim();

async function pdf(title: string, sections: { heading: string; lines: string[] }[]) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28, height = 841.89;
  let page = doc.addPage([width, height]), y = height - 65;
  const draw = (s: string, x: number, sz: number, strong = false) => {
    page.drawText(flat(s), { x, y, size: sz, font: strong ? bold : regular, color: rgb(0.14,0.17,0.15) });
  };
  const newPage = () => { page = doc.addPage([width,height]); y = height - 62; };
  const para = (value: string, sz=10.6, indent=0) => {
    const f = regular; const max=width-108-indent;
    const words=flat(value).split(/\s+/).filter(Boolean);
    let line="";
    for (const word of words) {
      const candidate=line ? line+" "+word : word;
      if (f.widthOfTextAtSize(candidate, sz)>max && line) {
        if (y < 75) newPage();
        draw(line,54+indent,sz); y -= 15; line=word;
      } else line=candidate;
    }
    if(line){if(y<75)newPage();draw(line,54+indent,sz);y-=15;}
    y-=5;
  };
  draw("VFORGE  /  PARTNER LAB",54,11,true);y-=32;
  para(title,21);y-=6;
  for (const section of sections) {
    if(y<105)newPage();
    draw(section.heading,54,13,true);y-=24;
    for(const line of section.lines)para(line);
    y-=12;
  }
  doc.setTitle(flat(title));doc.setAuthor("VForge / Casa Luis");
  return Buffer.from(await doc.save());
}
const publicText=(s:string,max=200)=>String(s||"").replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,"[dato omitido]")
  .replace(/\+?\d[\d ()-]{8,}\d/g,"[dato omitido]").slice(0,max).trim();
export async function partnerDocumentPack(args: { business: string; app: string; description?: string }, userId: string): Promise<FileItem[]> {
  if(!userId)throw new Error("Inicia sesión para emitir documentos de la prueba");
  const business=publicText(args.business,90), app=publicText(args.app,90), description=publicText(args.description||"",300);
  if(!business||!app)throw new Error("Faltan el giro y la idea de aplicación");
  // Los PDFs son enlaces compartibles; nunca incorporar información financiera, personal o secretos.
  const design=designPlan(business+" "+app+" "+description);
  const content=[
    {kind:"roadmap",title:"Roadmap de "+app,sections:[
      {heading:"Objetivo",lines:["Aplicacion: "+app+". Sector: "+business+".",description||"Propuesta demostrativa para identificar oportunidades comerciales."]},
      {heading:"Fase 1 - Descubrimiento",lines:["Conversar con Sara sobre usuarios, problema, cobro y objetivo del cliente. Elegir una funcion principal y criterios de aceptacion."]},
      {heading:"Fase 2 - Producto y diseno",lines:["Mapa de pantallas, identidad visual y roles. "+design.navegacion,...design.reglas.slice(0,4)]},
      {heading:"Fase 3 - Infraestructura",lines:["Repositorio GitHub de laboratorio, proyecto Vercel, PWA, base de datos Neon cuando se requiera, autenticacion segun roles y APIs verificadas."]},
      {heading:"Fase 4 - Pruebas y entrega",lines:["Pruebas movil y escritorio, flujos completos, teclado y navegacion, permisos y almacenamiento. Publicar con commit verificable."]},
      {heading:"Alcance de esta prueba",lines:["Demo patrocinada por Luis. No incluye compra automatica de dominio, pagos reales ni entrega comercial firmada."]},
    ]},
    {kind:"tecnica",title:"Guia tecnica de "+app,sections:[
      {heading:"Arquitectura objetivo",lines:["Frontend PWA responsive, rutas claras, estados reales. Vercel para despliegue; GitHub para versionado; Neon para datos; auth aislado por usuarios y roles."]},
      {heading:"Diseno Craft",lines:[design.referencia,design.navegacion,...design.reglas]},
      {heading:"Seguridad de acceso",lines:["MCP con OAuth de VForge. Sara se identifica mediante su sesion. Sus acciones pasan por autorizacion, limites de prueba y bitacora.","Los secretos de Luis permanecen en el servidor y no se envian al modelo ni a la clienta. No usar llaves admin en apps de prueba.","Autenticacion de usuarios finales: Clerk si se puede aprovisionar y verificar; de lo contrario marcar pendiente y no simular registro real."]},
      {heading:"Implementaciones",lines:["1. Repositorio privado de laboratorio; 2. Interface y manifest; 3. APIs y base de datos; 4. Autenticacion y permisos; 5. DNS y HTTPS; 6. Pruebas funcionales; 7. despliegue."]},
      {heading:"Integraciones disponibles",lines:["VForge, GitHub, Vercel, Neon y proveedores del arsenal segun autorizaciones. Cada integracion requiere prueba real de token, cuota y operacion; no basta con estar en el catalogo."]},
      {heading:"Criterios para liberar",lines:design.verificacion},
    ]},
    {kind:"contrato",title:"Contrato tipo de prueba y futura implementacion",sections:[
      {heading:"BORRADOR - NO FIRMADO",lines:["Plantilla comercial orientativa. Requiere revision de las partes y asesoria legal antes de constituir obligaciones."]},
      {heading:"Partes",lines:["Prestador: entidad VForge/All Global Holding que se determine en la contratacion. Contraparte: cliente final por identificar. Sara participa como posible colaboradora comercial; no se presume mandato, agencia o comision pactada."]},
      {heading:"Objeto",lines:["Descubrimiento, prototipo y eventual desarrollo de "+app+" para el sector "+business+", sujeto a una propuesta final de alcance."]},
      {heading:"Entregables",lines:["Diseño aprobado, codigo versionado, PWA operativa, integraciones pactadas, documentacion, pruebas y despliegue verificable."]},
      {heading:"Pagos y plazos",lines:["Se estableceran por escrito antes de contratar. Este documento no fija precio, porcentaje, plazo de entrega ni autorizacion de cargo."]},
      {heading:"Propiedad y confidencialidad",lines:["La demo de laboratorio queda bajo control de VForge/Casa Luis segun las instrucciones de Luis. La propiedad y licencia del desarrollo contratado se determinaran por escrito.","Las credenciales, datos de clientes y memorias privadas no se entregan mediante el MCP."]},
      {heading:"Cambios y aceptacion",lines:["Los cambios fuera del alcance requieren cotizacion. Entrega sujeta a pruebas funcionales, seguridad, accesibilidad y conformidad del cliente."]},
      {heading:"Firmas",lines:["Luis / representante autorizado: _____________________","Cliente: _____________________","Fecha y jurisdiccion: _____________________"]},
    ]},
  ];
  const slug=createHash("sha256").update(userId).digest("hex").slice(0,12),run=randomBytes(5).toString("hex");
  const files: FileItem[]=[];
  for(const item of content){
    const bytes=await pdf(item.title,item.sections);
    const saved=await put("partner-lab/"+slug+"/"+run+"-"+item.kind+".pdf",bytes,{
      access:"public",contentType:"application/pdf",addRandomSuffix:true,
    });
    files.push({kind:item.kind,title:item.title,url:saved.url});
  }
  return files;
}
