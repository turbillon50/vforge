"use client";
import { useState } from "react";

type ZipEntry = { name: string; size: number; compressed: number };
export type ZipManifest = { filename: string; sha256: string; entries: ZipEntry[]; totalBytes: number; checkedAt: string };
/** Read-only ZIP inventory: central directory parsing, no decompression, no upload. */
export function ZipReceiver({ onManifest }: { onManifest: (m: ZipManifest) => void }) {
 const [error,setError] = useState(""); const [files,setFiles] = useState<ZipEntry[]>([]); const [busy,setBusy]=useState(false);
 async function inspect(file?:File) {
  if(!file)return;setBusy(true);setError("");setFiles([]);
  try {
   if(file.size>15_000_000)throw Error("Máximo 15 MB por ZIP.");
   const b=await file.arrayBuffer(), d=new DataView(b), bytes=new Uint8Array(b);
   if(d.byteLength<22 || d.getUint32(0,true)!==0x04034b50)throw Error("No es un ZIP válido.");
   let end=-1;for(let i=b.byteLength-22;i>=Math.max(0,b.byteLength-65557);i--){if(d.getUint32(i,true)===0x06054b50){end=i;break;}}
   if(end<0)throw Error("Directorio ZIP no encontrado.");
   const count=d.getUint16(end+10,true),start=d.getUint32(end+16,true),size=d.getUint32(end+12,true);
   if(count>300||start+size>b.byteLength||count===65535)throw Error("ZIP demasiado grande o formato no admitido.");
   let at=start,total=0;const entries:ZipEntry[]=[];
   for(let i=0;i<count;i++){
    if(at+46>b.byteLength||d.getUint32(at,true)!==0x02014b50)throw Error("Directorio ZIP corrupto.");
    const compressed=d.getUint32(at+20,true),length=d.getUint32(at+24,true),n=d.getUint16(at+28,true),extra=d.getUint16(at+30,true),comment=d.getUint16(at+32,true);
    if(at+46+n+extra+comment>b.byteLength)throw Error("Entrada ZIP truncada.");
    const name=new TextDecoder().decode(bytes.slice(at+46,at+46+n));
    if(name.startsWith("/")||name.includes("\\")||name.split("/").includes("..")||/^[a-zA-Z]:/.test(name))throw Error("Ruta peligrosa en ZIP.");
    total+=length;if(total>60_000_000)throw Error("Contenido declarado supera 60 MB.");
    if(!name.endsWith("/"))entries.push({name,size:length,compressed});
    at+=46+n+extra+comment;
   }
   const digest=await crypto.subtle.digest("SHA-256",b);
   const sha256=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
   setFiles(entries);onManifest({filename:file.name,sha256,entries,totalBytes:total,checkedAt:new Date().toISOString()});
  }catch(e){setError(e instanceof Error?e.message:"No se pudo analizar el ZIP");}finally{setBusy(false);}
 }
 return <div className="zip-receiver"><strong>01 · Entrada de ZIP</strong><p>Inventario local, sin enviar archivos al servidor.</p><label className="zip-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void inspect(e.dataTransfer.files[0]);}}>Seleccionar o arrastrar ZIP<input type="file" accept=".zip,application/zip" onChange={e=>void inspect(e.target.files?.[0])}/></label>{busy&&<p>Analizando…</p>}{error&&<p role="alert">{error}</p>}{files.length>0&&<div><p>{files.length} archivos identificados</p><ul>{files.slice(0,30).map((f,i)=><li key={i}>{f.name} · {f.size} B</li>)}</ul></div>}<small>El manifiesto se guarda con Guardar cambios. El ZIP original aún no se almacena.</small></div>;
}
