/**
 * VForge Partner — memoria de socias, aislada por identidad Clerk.
 * Nunca persiste llaves, tokens ni contenido de Casa Luis.
 */
import { sql } from "@/lib/db/client";

let created = false;
async function ensurePartnerMemory() {
  if (created) return;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_partner_memories (
      id BIGSERIAL PRIMARY KEY,
      clerk_user_id TEXT NOT NULL,
      org_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS partner_memories_user_idx
    ON vforge_partner_memories (clerk_user_id, created_at DESC)
  `;
  created = true;
}

export async function partnerRemember(
  userId: string, orgId: string, topic: string, content: string,
): Promise<{ id: string; topic: string; created_at: string }> {
  if (!userId || !orgId) throw new Error("Identidad y espacio de socia requeridos");
  if (!topic.trim() || !content.trim()) throw new Error("Tema y aprendizaje requeridos");
  if (content.length > 3000 || topic.length > 120) throw new Error("Memoria demasiado extensa");
  await ensurePartnerMemory();
  const rows = await sql`
    INSERT INTO vforge_partner_memories (clerk_user_id, org_id, topic, content)
    VALUES (${userId}, ${orgId}, ${topic.trim()}, ${content.trim()})
    RETURNING id::text, topic, created_at::text
  `;
  return rows[0] as { id: string; topic: string; created_at: string };
}

export async function partnerRecall(userId: string, orgId: string, query: string) {
  if (!userId || !orgId) throw new Error("Identidad y espacio de socia requeridos");
  await ensurePartnerMemory();
  const q = query.trim().slice(0, 120);
  const rows = await sql`
    SELECT topic, content, created_at::text
    FROM vforge_partner_memories
    WHERE clerk_user_id = ${userId} AND org_id = ${orgId}
      AND (${q} = '' OR topic ILIKE ('%' || ${q} || '%')
                    OR content ILIKE ('%' || ${q} || '%'))
    ORDER BY created_at DESC LIMIT 25
  `;
  return rows;
}

export const SARA_WELCOME = [
  "Hola, Sara. Soy VForge Partner, el equipo digital de la fabrica de aplicaciones de Luis.",
  "Luis quiso mostrarte su manera de trabajar: de una conversacion sencilla podemos pasar a una propuesta y, con las conexiones autorizadas, a una PWA publicada.",
  "Tu papel es comercial: detectar oportunidades, presentar soluciones y ayudar a cerrar proyectos, sin programar.",
  "Te mostrare capacidades comprobadas y distinguire las integraciones que necesitan activacion. Las cuentas privadas de Luis no se comparten.",
  "Para comenzar, cuentame: ¿a que te dedicas y que clase de negocios conoces?",
].join("\n\n");

/**
 * Historia autorizada del nombre. No se ofrece de manera espontánea:
 * solamente cuando Sara pregunta expresamente por ALIX.
 */
export const SARA_ALIX_NOMBRE = [
  "ALIX tiene una historia especial para Luis y existen dos versiones sobre el origen de su nombre.",
  "La versión oficial es una idea de diseño: Luis explica que, si giras ALIX en el ángulo correcto, puedes leer 'AI LX'. Es el juego visual que eligió para representarla.",
  "La segunda versión es una posibilidad personal que él todavía no considera confirmada: el nombre estaría relacionado con algo que en su momento no pudo ser. No conozco más detalles y prefiero no inventarlos.",
  "ALIX es el sistema personal de Luis, conectado al ecosistema tecnológico de VForge; yo soy VForge Partner, la asistente para esta demostración comercial.",
].join("\n\n");

export function partnerIdeas(activity: string) {
  const a = activity.toLowerCase();
  let ideas = [
    ["Portal de clientes", "Solicitudes, seguimiento, pagos y mensajes"],
    ["Agenda inteligente", "Reservaciones, recordatorios y ventas"],
    ["CRM comercial", "Prospectos, cotizaciones y automatizaciones"],
  ];
  if (/inmobil|casa|terreno|propiedad|renta|real estate/.test(a)) ideas = [
    ["Vitrina inmobiliaria", "Inventario, recorridos y captura de prospectos"],
    ["CRM de propiedades", "Leads, seguimiento, visitas y cotizaciones"],
    ["Portal de propietarios", "Estados de cuenta y documentación"],
  ];
  else if (/restaur|comida|bar|cafe|hotel|turis|viaje/.test(a)) ideas = [
    ["Reservas directas", "Disponibilidad, confirmación y recordatorios"],
    ["Experiencias y recomendaciones", "Catálogo, rutas, mapas y consulta"],
    ["Programa de clientes", "Fidelización, campañas y ventas directas"],
  ];
  else if (/salud|medic|fisio|clinica|dentista|belleza/.test(a)) ideas = [
    ["Agenda y pacientes", "Turnos, recordatorios y acceso privado"],
    ["Programas personalizados", "Contenido asignado y seguimiento"],
    ["CRM de clínica", "Cotizaciones, campañas y administración"],
  ];
  return {
    based_on: activity.slice(0, 300),
    suggestions: ideas.map(([name, benefit]) => ({ name, benefit })),
    next_question: "Sara, ¿cuál de estas ideas ayudaría más a tus clientes a vender o trabajar mejor?",
    note: "Son propuestas. Precios, proveedores, cuotas y despliegues requieren validación antes de prometerse.",
  };
}
