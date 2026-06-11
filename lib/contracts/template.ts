/**
 * Plantilla de contrato V-Momentum / All Global Holding.
 *
 * Genera el documento HTML del contrato de servicios de desarrollo a partir
 * de los datos reales del proyecto y su esquema de pagos. Este HTML es lo que
 * se manda a DocuSign como documento a firmar (DocuSign lo convierte a PDF).
 *
 * El ancla de firma `**firma_cliente**` se usa como anchorString para colocar
 * la pestaña de firma del cliente en el lugar correcto.
 */
import { buildPaymentSchedule } from "./payments";

export interface ContractTemplateData {
  contractId: string;
  projectName: string;
  clientName: string;
  product: string;
  amountMxn: number;
  signerName: string;
  date?: string; // dd/mm/aaaa; default: hoy (lo pone el caller para evitar Date en build)
}

const fmt = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0 })} MXN`;

export function renderContractHtml(d: ContractTemplateData): string {
  const schedule = buildPaymentSchedule(d.amountMxn);
  const fecha = d.date ?? "____________";
  const rows = schedule
    .map(
      (p) =>
        `<tr><td>${p.idx}. ${p.label}</td><td style="text-align:right">${fmt(
          p.amount_mxn,
        )}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;line-height:1.6;max-width:720px;margin:0 auto;padding:48px 36px;font-size:13px;}
  h1{font-size:20px;text-align:center;letter-spacing:.04em;margin-bottom:4px;}
  .sub{text-align:center;color:#555;font-size:11px;margin-bottom:28px;text-transform:uppercase;letter-spacing:.12em;}
  h2{font-size:13px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:24px;text-transform:uppercase;letter-spacing:.06em;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  td{padding:6px 8px;border-bottom:1px solid #eee;}
  .total td{font-weight:bold;border-top:2px solid #333;border-bottom:none;}
  .firmas{display:flex;justify-content:space-between;margin-top:64px;gap:40px;}
  .firma{flex:1;text-align:center;border-top:1px solid #333;padding-top:8px;font-size:11px;}
  .meta{color:#666;font-size:11px;margin-top:4px;}
</style></head>
<body>
  <h1>CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO DE SOFTWARE</h1>
  <p class="sub">All Global Holding LLC · V Momentum</p>

  <p>En la ciudad de Cancún, Quintana Roo, con fecha <strong>${fecha}</strong>, celebran el presente contrato por una parte
  <strong>All Global Holding LLC</strong> (en adelante "EL PRESTADOR"), representada por Luis Humberto De la Torre Herrera,
  y por la otra parte <strong>${d.clientName}</strong> (en adelante "EL CLIENTE"), conforme a las siguientes cláusulas.</p>

  <h2>Primera — Objeto</h2>
  <p>EL PRESTADOR desarrollará para EL CLIENTE el producto de software denominado
  <strong>${d.projectName}</strong>, bajo el alcance: <em>${d.product}</em>, entregado como aplicación web/PWA
  funcional, desplegada y operativa.</p>

  <h2>Segunda — Contraprestación</h2>
  <p>El monto total de los servicios es de <strong>${fmt(d.amountMxn)}</strong>, pagadero en el siguiente
  esquema de tres parcialidades:</p>
  <table>
    ${rows}
    <tr class="total"><td>Total</td><td style="text-align:right">${fmt(d.amountMxn)}</td></tr>
  </table>

  <h2>Tercera — Entregables y plazos</h2>
  <p>EL PRESTADOR entregará avances verificables a través del portal del cliente de V·Forge, donde EL CLIENTE
  podrá dar seguimiento en tiempo real al progreso, subir evidencias y comentarios. La entrega final se realiza
  contra el pago de la última parcialidad.</p>

  <h2>Cuarta — Propiedad y confidencialidad</h2>
  <p>Una vez liquidado el monto total, EL CLIENTE adquiere los derechos de uso del producto entregado. Ambas
  partes guardarán confidencialidad sobre la información intercambiada.</p>

  <h2>Quinta — Vigencia</h2>
  <p>El presente contrato entra en vigor a la fecha de firma y permanece vigente hasta la entrega final y
  liquidación total de la contraprestación.</p>

  <div class="firmas">
    <div class="firma">
      Luis H. De la Torre Herrera<br/>
      <span class="meta">All Global Holding LLC — EL PRESTADOR</span>
    </div>
    <div class="firma">
      **firma_cliente**<br/>
      ${d.signerName}<br/>
      <span class="meta">EL CLIENTE</span>
    </div>
  </div>

  <p class="meta" style="margin-top:40px;text-align:center">Folio de contrato: ${d.contractId}</p>
</body></html>`;
}
