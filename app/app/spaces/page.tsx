"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/components/spaces/spaces.css";
export default function SpacesPage() {
  const router = useRouter();
  const [projects,setProjects] = useState<Array<{id:string;name:string}>>([]);
  const [search,setSearch] = useState("");
  const [name,setName] = useState(""); const [description,setDescription] = useState("");
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  useEffect(() => { void fetch("/api/projects",{cache:"no-store"}).then(async r => {const d=await r.json();if(!r.ok)throw new Error(d.error);setProjects(d.projects);}).catch(e=>setError(e.message)); },[]);
  async function create(e: React.FormEvent) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const slug=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
      const id=`${slug || "proyecto"}-${crypto.randomUUID().slice(0,8)}`;
      const r=await fetch("/api/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name,description,create_repo:false,category:"en_revision"})});
      const d=await r.json();if(!r.ok)throw new Error(d.error || "No se pudo crear");router.push(`/app/spaces/${encodeURIComponent(d.id)}`);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo crear");}finally{setBusy(false);}
  }
  const matches = projects.filter(p => `${p.name} ${p.id}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  return <section className="vf-space"><header className="space-head"><div><h1>Spaces</h1><p>Organiza el trabajo desde la primera idea hasta la entrega.</p></div><Link href="/app/projects">Ver cartera →</Link></header>{error&&<p role="alert" className="space-message">{error}</p>}<details className="space-context"><summary>+ Nuevo proyecto desde una idea</summary><form onSubmit={e=>void create(e)} className="space-list"><label>Nombre<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} /></label><label>Objetivo<textarea maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)} /></label><div><p>No requiere GitHub, Vercel ni dominio. Podrás conectarlos después.</p><button disabled={busy || !name.trim()}>{busy?"Creando…":"Crear proyecto y abrir Space"}</button></div></form></details><div className="space-search"><label htmlFor="space-search-input">Buscar mis Spaces<input id="space-search-input" type="search" autoComplete="off" placeholder="Escribe el nombre del proyecto, por ejemplo vedika2" value={search} onChange={e=>setSearch(e.target.value)} /></label><span>{matches.length} de {projects.length} proyectos</span></div>{matches.length===0 && !error && <p className="space-search-empty">No encontramos Spaces con ese nombre. Prueba otra palabra.</p>}<div className="space-list">{matches.map(p=><Link className="space-card space-context" key={p.id} href={`/app/spaces/${encodeURIComponent(p.id)}`}><strong>{p.name}</strong><span>Abrir Space →</span></Link>)}</div></section>;
}
