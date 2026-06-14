/**
 * PROPOSITO — motor de entendimiento de negocio + diagnóstico vivo.
 *
 * Lee SOLO señales reales del proyecto (integraciones conectadas, secretos
 * cifrados presentes, dominio/deploy, y el stack declarado en el Brain) y
 * dice qué falta para dejar la app AL 100% funcional. Nada inventado: si no
 * hay señal, se reporta como faltante.
 */
import { queryOne, queryAll } from "@/lib/db/client";

export interface Capability {
  key: string;
  label: string;
  recommend: string;
}

/** Catálogo de capacidades que una app de producto suele necesitar. */
export const CAPABILITIES: Capability[] = [
  { key: "auth", label: "Autenticación", recommend: "Conecta Clerk para login/registro de usuarios." },
  { key: "database", label: "Base de datos", recommend: "Conecta Neon (Postgres) para persistir datos." },
  { key: "hosting", label: "Hosting / Deploy", recommend: "Despliega en Vercel y verifica que el deploy esté Ready." },
  { key: "domain", label: "Dominio propio", recommend: "Asigna un dominio propio (no *.vercel.app) y apúntalo." },
  { key: "payments", label: "Pagos", recommend: "Conecta Stripe o Mercado Pago para cobrar." },
  { key: "email", label: "Email transaccional", recommend: "Conecta Resend para correos (verificación, recibos)." },
  { key: "sms_whatsapp", label: "SMS / WhatsApp", recommend: "Conecta Twilio para SMS/WhatsApp y verificaciones." },
  { key: "tickets", label: "Boletos / Eventos", recommend: "Conecta Ticket Tailor para venta de boletos." },
  { key: "maps", label: "Mapas / Geo", recommend: "Conecta Google Maps para rutas y ubicación." },
  { key: "storage", label: "Almacenamiento", recommend: "Conecta Vercel Blob/S3 para archivos e imágenes." },
  { key: "ai", label: "IA", recommend: "Conecta un proveedor de IA (Anthropic/OpenAI) si el producto lo usa." },
];

const CAP_BY_KEY = new Map(CAPABILITIES.map((c) => [c.key, c]));

// Palabras clave (en kind de integración, provider/name de secreto, o stack)
// que delatan que una capacidad está presente. Todo en minúsculas.
const SIGNALS: Record<string, string[]> = {
  auth: ["clerk", "auth", "nextauth", "supabase_auth"],
  database: ["neon", "postgres", "database_url", "supabase", "planetscale", "mongo"],
  hosting: ["vercel", "nextjs", "next", "netlify"],
  domain: [],
  payments: ["stripe", "mercadopago", "mercado_pago", "mp_", "paypal", "conekta"],
  email: ["resend", "sendgrid", "postmark", "ses"],
  sms_whatsapp: ["twilio", "whatsapp", "baileys", "messagebird"],
  tickets: ["ticket_tailor", "tickettailor", "eventbrite"],
  maps: ["maps", "google_maps", "mapbox", "geolocation"],
  storage: ["blob", "s3", "cloudinary", "uploadthing"],
  ai: ["anthropic", "openai", "openrouter", "gemini", "claude"],
};

export interface DiagnosticItem {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
  source: string | null; // dónde se detectó (integración, secreto, stack, dominio)
  recommend: string | null;
}

export interface Proposito {
  summary: string | null;
  audience: string | null;
  problem: string | null;
  revenue_model: string | null;
  business_model: string | null;
  north_star: string | null;
  value_prop: string | null;
  needs: string[];
  declared_stack: Record<string, unknown>;
  updated_at: string | null;
}

export interface SphereState {
  level: number;       // 0-100 nivel agregado de avance real
  stage: string;       // etiqueta del nivel
  signals: { readiness: number; deploy: number; commits: number; timeline: number };
}

export interface PropositoResult {
  project: { id: string; name: string; domain: string | null; vercel_url: string | null };
  proposito: Proposito | null;
  understanding_completeness: number; // 0-100
  readiness: number; // 0-100 funcional
  required_total: number;
  present_total: number;
  items: DiagnosticItem[];
  missing: DiagnosticItem[];
  needs_input: boolean;
  sphere: SphereState;
}

function hasSignal(haystack: Set<string>, cap: string): boolean {
  const sigs = SIGNALS[cap] ?? [];
  for (const s of sigs) {
    for (const h of haystack) {
      if (h.includes(s)) return true;
    }
  }
  return false;
}

function sphereStage(level: number): string {
  if (level >= 100) return "Encendida";
  if (level >= 76) return "Casi lista";
  if (level >= 51) return "Cobrando vida";
  if (level >= 21) return "Tomando forma";
  return "Forjando";
}

export async function diagnoseProposito(projectId: string): Promise<PropositoResult | null> {
  const project = await queryOne<{
    id: string; name: string; domain: string | null; vercel_url: string | null;
  }>(
    `SELECT id, name, domain, vercel_url FROM projects WHERE id = $1 LIMIT 1`,
    [projectId],
  );
  if (!project) return null;

  const prop = await queryOne<Proposito>(
    `SELECT summary, audience, problem, revenue_model, business_model, north_star,
            value_prop, needs, declared_stack, updated_at
       FROM project_proposito WHERE project_id = $1`,
    [projectId],
  );

  const integrations = await queryAll<{ kind: string; status: string; label: string }>(
    `SELECT kind, status, label FROM project_integrations WHERE project_id = $1`,
    [projectId],
  );
  const secrets = await queryAll<{ name: string; provider: string | null }>(
    `SELECT name, provider FROM project_secrets WHERE project_id = $1`,
    [projectId],
  );

  // Bolsa de señales reales (minúsculas).
  const connected = new Set<string>();
  for (const i of integrations) {
    if (i.status === "connected" || i.status === "verified" || i.status === "active") {
      connected.add(`${i.kind}`.toLowerCase());
      if (i.label) connected.add(i.label.toLowerCase());
    }
  }
  const secretBag = new Set<string>();
  for (const s of secrets) {
    if (s.name) secretBag.add(s.name.toLowerCase());
    if (s.provider) secretBag.add(s.provider.toLowerCase());
  }
  const declared = (prop?.declared_stack ?? {}) as Record<string, unknown>;
  const declaredBag = new Set<string>();
  for (const [k, v] of Object.entries(declared)) {
    declaredBag.add(k.toLowerCase());
    if (typeof v === "string") declaredBag.add(v.toLowerCase());
  }

  // Capacidades requeridas: base + declaradas en stack + needs explícitos.
  const required = new Set<string>(["auth", "database", "hosting", "domain"]);
  for (const cap of CAPABILITIES) {
    if (hasSignal(declaredBag, cap.key)) required.add(cap.key);
  }
  // Mapear llaves directas del stack del Brain (auth, db, maps, payments…).
  const stackKeyMap: Record<string, string> = {
    auth: "auth", db: "database", database: "database", maps: "maps",
    payments: "payments", email: "email", sms: "sms_whatsapp", whatsapp: "sms_whatsapp",
    framework: "hosting", tickets: "tickets", storage: "storage", ai: "ai",
  };
  for (const k of Object.keys(declared)) {
    const mapped = stackKeyMap[k.toLowerCase()];
    if (mapped && declared[k]) required.add(mapped);
  }
  for (const n of (prop?.needs ?? [])) {
    if (CAP_BY_KEY.has(n)) required.add(n);
  }

  const items: DiagnosticItem[] = CAPABILITIES.map((cap) => {
    let present = false;
    let source: string | null = null;

    if (cap.key === "domain") {
      present = Boolean(project.domain && !/vercel\.app$/i.test(project.domain));
      source = present ? "dominio" : null;
    } else if (cap.key === "hosting") {
      present = Boolean(project.vercel_url) || hasSignal(connected, "hosting") || hasSignal(declaredBag, "hosting");
      source = project.vercel_url ? "deploy" : present ? "stack" : null;
    } else {
      if (hasSignal(connected, cap.key)) { present = true; source = "integración"; }
      else if (hasSignal(secretBag, cap.key)) { present = true; source = "secreto"; }
      else if (hasSignal(declaredBag, cap.key)) { present = true; source = "stack"; }
    }

    return {
      key: cap.key,
      label: cap.label,
      required: required.has(cap.key),
      present,
      source,
      recommend: present ? null : cap.recommend,
    };
  });

  const requiredItems = items.filter((i) => i.required);
  const presentRequired = requiredItems.filter((i) => i.present);
  const readiness = requiredItems.length
    ? Math.round((presentRequired.length / requiredItems.length) * 100)
    : 0;
  const missing = requiredItems.filter((i) => !i.present);

  // Completitud del entendimiento (7 campos de negocio).
  const fields = prop
    ? [prop.summary, prop.audience, prop.problem, prop.revenue_model, prop.business_model, prop.north_star, prop.value_prop]
    : [];
  const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
  const completeness = Math.round((filled / 7) * 100);

  // ===== Esfera: nivel agregado del % real (commits + deploys + roadmap + readiness) =====
  const deploys = await queryAll<{ state: string; created_at: string }>(
    `SELECT state, created_at FROM project_deploys WHERE project_id = $1
      ORDER BY created_at DESC LIMIT 20`,
    [projectId],
  );
  const tl = await queryAll<{ status: string; stage: string; created_at: string }>(
    `SELECT status, stage, created_at FROM project_timeline WHERE project_id = $1`,
    [projectId],
  );
  let deployHealth = project.vercel_url ? 60 : 0;
  if (deploys.length > 0) {
    const st = deploys[0].state;
    deployHealth = st === "ready" || st === "succeeded" ? 100 : st === "error" || st === "canceled" ? 20 : 50;
  }
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentDev = tl.filter(
    (e) => e.stage === "dev" && new Date(e.created_at).getTime() >= since,
  ).length;
  const commitMomentum = tl.length === 0 ? 0 : Math.min(100, recentDev * 12 || 15);
  const tlDone = tl.filter((e) => e.status === "done").length;
  const timelineProgress = tl.length ? Math.round((tlDone / tl.length) * 100) : 0;
  const level = Math.round(
    0.4 * readiness + 0.2 * deployHealth + 0.2 * commitMomentum + 0.2 * timelineProgress,
  );
  const sphere: SphereState = {
    level,
    stage: sphereStage(level),
    signals: { readiness, deploy: deployHealth, commits: commitMomentum, timeline: timelineProgress },
  };

  return {
    project,
    proposito: prop,
    understanding_completeness: completeness,
    readiness,
    required_total: requiredItems.length,
    present_total: presentRequired.length,
    items,
    missing,
    needs_input: !prop || filled === 0,
    sphere,
  };
}
