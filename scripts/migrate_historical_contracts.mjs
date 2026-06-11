/**
 * Migración de los 4 contratos históricos de Luis desde la "estructura anterior"
 * (el arreglo hardcodeado que renderizaba la página /app/contracts en el commit
 * cff3329) hacia las tablas nuevas `contracts` + `contract_payments` (migración
 * 018). Idempotente: re-ejecutable sin duplicar.
 *
 * Fuente legacy (lo que Luis veía):
 *   VF-0042  CSN Carnes Selectas        Aplicación Personalizada  $12,000  firmado    100%  12 May 2026
 *   VF-0041  Hilda — HappyToc           App + Publicación iOS      $17,000  pendiente   60%  08 Jun 2026
 *   VF-0040  Joel Tejeda — MT Empresarial Aplicación Personalizada $12,000  firmado    100%  28 Abr 2026
 *   VF-0043  Nataly Cruz — Lnred        MCP Empresarial            $25,000  borrador    15%  —
 *
 * Mapeo de estado:  firmado→signed · pendiente→sent · borrador→draft
 * El bar de avance legacy (100/60/100/15) se preserva como parcialidades pagadas
 * (3/2/3/0 de 3), redondeando al tercio más cercano.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.PGURL);

// Esquema de 3 pagos V-Momentum (idéntico a lib/contracts/payments.ts).
const LABELS = ["Anticipo (arranque)", "Avance (50%)", "Entrega (final)"];
function buildSchedule(amountMxn) {
  const total = Math.max(0, Math.round(amountMxn));
  const third = Math.floor(total / 3);
  const remainder = total - third * 3;
  return LABELS.map((label, i) => ({
    idx: i + 1,
    label,
    amount_mxn: third + (i === 0 ? remainder : 0),
  }));
}

// Los 4 contratos. project_id alineado con client_project_status (la cartera),
// para que el join de avance de cobro en queries.ts siga funcionando.
const CONTRACTS = [
  {
    project_id: "csn-carnes",
    project_name: "CSN Carnes (carnesn.ink)",
    domain: "carnesn.ink",
    client_name: "CSN Carnes Selectas",
    signer_name: null,
    product: "Aplicación Personalizada",
    amount: 12000,
    status: "signed",
    sent_at: "2026-05-12",
    signed_at: "2026-05-12",
    created_at: "2026-05-12",
    paid_installments: 3, // legacy 100%
  },
  {
    project_id: "happytoc",
    project_name: "Happytoc (happytoc.life)",
    domain: "happytoc.life",
    client_name: "Hilda — HappyToc",
    signer_name: "Hilda",
    product: "App + Publicación iOS",
    amount: 17000,
    status: "sent",
    sent_at: "2026-06-08",
    signed_at: null,
    created_at: "2026-06-08",
    paid_installments: 2, // legacy 60% → 2/3
  },
  {
    project_id: "mt-empresarial",
    project_name: "MT Empresarial (mtempresarial.life)",
    domain: "mtempresarial.life",
    client_name: "Joel Tejeda — MT Empresarial",
    signer_name: "Joel Tejeda",
    product: "Aplicación Personalizada",
    amount: 12000,
    status: "signed",
    sent_at: "2026-04-28",
    signed_at: "2026-04-28",
    created_at: "2026-04-28",
    paid_installments: 3, // legacy 100%
  },
  {
    project_id: "lnred",
    project_name: "LN RED (lnred.ink)",
    domain: "lnred.ink",
    client_name: "Nataly Cruz — Lnred",
    signer_name: "Nataly Cruz",
    product: "MCP Empresarial",
    amount: 25000,
    status: "draft",
    sent_at: null,
    signed_at: null,
    created_at: "2026-06-09",
    paid_installments: 0, // legacy 15% → 0/3
  },
];

async function run() {
  for (const c of CONTRACTS) {
    // 1) Asegurar la fila de projects (la FK de contracts apunta aquí).
    await sql.query(
      `INSERT INTO projects (id, name, domain, category, status)
       VALUES ($1, $2, $3, 'produccion', 'live')
       ON CONFLICT (id) DO NOTHING`,
      [c.project_id, c.project_name, c.domain],
    );

    // 2) Idempotencia: no duplicar si ya existe el contrato de ese cliente.
    const existing = await sql.query(
      `SELECT id FROM contracts WHERE project_id = $1 AND client_name = $2`,
      [c.project_id, c.client_name],
    );
    let contractId;
    if (existing.length) {
      contractId = existing[0].id;
      await sql.query(
        `UPDATE contracts SET product=$2, amount_mxn=$3, status=$4,
           signer_name=$5, sent_at=$6, signed_at=$7, created_at=$8, updated_at=now()
         WHERE id=$1`,
        [
          contractId, c.product, c.amount, c.status, c.signer_name,
          c.sent_at, c.signed_at, c.created_at,
        ],
      );
    } else {
      const ins = await sql.query(
        `INSERT INTO contracts
           (project_id, client_name, product, amount_mxn, currency, status,
            signer_name, sent_at, signed_at, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'MXN',$5,$6,$7,$8,$9,$10, now())
         RETURNING id`,
        [
          c.project_id, c.client_name, c.product, c.amount, c.status,
          c.signer_name, c.sent_at, c.signed_at,
          "firstcontact@allglobalholding.com", c.created_at,
        ],
      );
      contractId = ins[0].id;
    }

    // 3) Las 3 parcialidades. Las primeras `paid_installments` quedan pagadas.
    const schedule = buildSchedule(c.amount);
    const paidAt = c.signed_at || c.sent_at || c.created_at;
    for (const p of schedule) {
      const isPaid = p.idx <= c.paid_installments;
      await sql.query(
        `INSERT INTO contract_payments (contract_id, idx, label, amount_mxn, status, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (contract_id, idx) DO UPDATE
           SET label=EXCLUDED.label, amount_mxn=EXCLUDED.amount_mxn,
               status=EXCLUDED.status, paid_at=EXCLUDED.paid_at`,
        [
          contractId, p.idx, p.label, p.amount_mxn,
          isPaid ? "paid" : "pending",
          isPaid ? paidAt : null,
        ],
      );
    }
    console.log(`✓ ${c.client_name} → ${contractId} (${c.status}, ${c.paid_installments}/3 pagado)`);
  }
}

run()
  .then(() => { console.log("\nMigración completada."); process.exit(0); })
  .catch((e) => { console.error("ERROR:", e); process.exit(1); });
