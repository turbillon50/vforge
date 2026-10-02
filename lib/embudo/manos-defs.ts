import { PROJECT_ETAPAS, PROJECT_ETAPA_LATERAL } from "@/lib/projects/etapas";

/** Definiciones (sin dependencias de servidor) de las "manos" del embudo + LUTOR. Ver lib/embudo/manos.ts. */
export type ManoTool = { name: string; description: string; schema: Record<string, unknown> };

export const MANOS_TOOLS: ManoTool[] = [
  {
    name: "vforge_pulso",
    description:
      "Lo que está pasando en la fábrica: clientes por etapa del embudo, cambios de etapa recientes, señales nuevas de clientes (lo que contestaron por WhatsApp) y mensajes en vivo por proyecto. Úsala al iniciar o cuando Luis pregunte '¿qué hay?'. JSON.",
    schema: { type: "object", properties: { horas: { type: "number", description: "Ventana hacia atrás (default 48)" } } },
  },
  {
    name: "embudo_tablero",
    description:
      "Línea de avance completa: proyectos con cliente agrupados por etapa (prospecto → chat cargado → demo en construcción → demo entregada → contrato enviado → firmado → en construcción → entregado → mantenimiento), con días en la etapa, demo y contrato. JSON.",
    schema: { type: "object", properties: {} },
  },
  {
    name: "embudo_cliente",
    description:
      "Expediente comercial de un proyecto: cliente, etapa, historial de etapas, demo, contrato, señales detectadas y los últimos mensajes del chat del cliente. JSON.",
    schema: {
      type: "object",
      properties: { proyecto: { type: "string", description: "id del proyecto (ej. jiraki-soccer-league)" } },
      required: ["proyecto"],
    },
  },
  {
    name: "embudo_mover",
    description:
      "Mueve un proyecto en la línea de avance: accion avanzar|regresar|perdido o etapa exacta. Úsala cuando haya evidencia (demo enviada, cliente aceptó, pagó). Escribe nota de por qué.",
    schema: {
      type: "object",
      properties: {
        proyecto: { type: "string" },
        accion: { type: "string", enum: ["avanzar", "regresar", "perdido"] },
        etapa: { type: "string", enum: [...PROJECT_ETAPAS, PROJECT_ETAPA_LATERAL] },
        nota: { type: "string" },
        demo_url: { type: "string" },
      },
      required: ["proyecto", "nota"],
    },
  },
  {
    name: "embudo_analizar",
    description:
      "Lee ahora la conversación del cliente (chats del proyecto con 'Seguir en vivo') y deja una señal con la acción sugerida (generar contrato, ajustar demo, responder, seguimiento). JSON.",
    schema: { type: "object", properties: { proyecto: { type: "string" } }, required: ["proyecto"] },
  },
  {
    name: "embudo_contrato",
    description:
      "Pide a LUTOR (el abogado) el contrato de desarrollo de la app del proyecto con la plantilla oficial contrato-pwa; devuelve el link para el cliente y pasa el proyecto a 'Contrato enviado'. Pide confirmación de Luis del monto antes de llamarla.",
    schema: {
      type: "object",
      properties: {
        proyecto: { type: "string" },
        monto_total: { type: "number", description: "MXN" },
        anticipo: { type: "number", description: "MXN; default 50%" },
        notas: { type: "string", description: "alcance, plazos, lo acordado" },
        modulos: { type: "array", items: { type: "string" } },
      },
      required: ["proyecto"],
    },
  },
  {
    name: "lutor",
    description:
      "Habla con LUTOR (el abogado de Luis) por su MCP: herramienta = nombre de la tool de LUTOR (lutor_buscar, lutor_contratos, lutor_contrato, lutor_expediente, lutor_obligaciones, lutor_alertas, lutor_legislacion, lutor_verificar_contraparte, lutor_contrato_crear…) y argumentos = su JSON. Sin herramienta devuelve la lista de tools de LUTOR.",
    schema: {
      type: "object",
      properties: {
        herramienta: { type: "string" },
        argumentos: { type: "object" },
      },
    },
  },
];

export const MANOS_TOOL_NAMES = new Set(MANOS_TOOLS.map((t) => t.name));
