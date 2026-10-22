/**
 * Consulta de dominios para el laboratorio de Sara. SOLO lectura.
 * Credenciales de Luis permanecen del lado servidor; nunca se entregan.
 */
import { getOperatorSecret } from "@/lib/vault/get-secret";

type DomainResult = {
  domain: string;
  available: boolean;
  purchase_price_usd: number | null;
  renewal_price_usd: number | null;
  premium: boolean;
  purchase_type: string;
};

const safePrefix = (s: string) => s
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9-]/g, "")
  .replace(/^-+|-+$/g, "").slice(0, 35);

export async function partnerDomainQuote(brand: string) {
  const base = safePrefix(brand.replace(/\s+/g, "-"));
  if (base.length < 3) throw new Error("Indica una marca de 3 o más caracteres para consultar dominios.");
  const candidates = [base, base+"app", base+"digital"].map(s => s.slice(0, 50)+".site");
  const username = await getOperatorSecret("NAMECOM_USER")
    .then(v => v || getOperatorSecret("NAME_USERNAME"));
  const token = await getOperatorSecret("NAMECOM_TOKEN")
    .then(v => v || getOperatorSecret("NAME_TOKEN"));
  if (!username || !token) return {
    ok: false,
    message: "Name.com no está habilitado en este entorno. No se muestran precios inventados.",
    candidates,
  };
  const authorization = "Basic " + Buffer.from(username+":"+token).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res=await fetch("https://api.name.com/v4/domains:checkAvailability",{
      method:"POST",
      headers:{"Authorization":authorization,"Content-Type":"application/json"},
      body:JSON.stringify({domainNames:candidates}),
      signal:controller.signal,
      cache:"no-store",
    });
    if(!res.ok) throw new Error("Name.com no respondió satisfactoriamente ("+res.status+")");
    const json=await res.json() as {results?:Array<{
      domainName?:string;purchasable?:boolean;purchasePrice?:number;renewalPrice?:number;premium?:boolean;purchaseType?:string
    }>};
    const results:DomainResult[]=(json.results||[])
      .filter(r=>r.domainName && candidates.includes(r.domainName))
      .map(r=>({
        domain:r.domainName!,
        available:r.purchasable===true,
        purchase_price_usd:typeof r.purchasePrice==="number"?r.purchasePrice:null,
        renewal_price_usd:typeof r.renewalPrice==="number"?r.renewalPrice:null,
        premium:r.premium===true,
        purchase_type:r.purchaseType||"unknown",
      }));
    return {ok:true,results, currency:"USD", order_status:"QUOTE_ONLY",
      warning:"Precios de consulta, sujetos a cambios y a impuestos. No se realizó compra. Renovación puede diferir del precio inicial.",
      next_step:"Sara elige dominio. Antes de cualquier compra, Luis aprueba el nombre y precio actualizado; ninguna herramienta de esta prueba cobra tarjetas."};
  } finally {clearTimeout(timeout);}
}
