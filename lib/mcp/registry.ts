/**
 * Registro de tools del MCP de VForge: SOLO datos, cero dependencias.
 *
 * Vive aparte de `tools.ts` (que arrastra Neon, GitHub y node:crypto) para que
 * la página pública /mcp pueda contar y listar las herramientas reales sin
 * cargar el runtime del servidor. El número de herramientas que ve el visitante
 * sale de aquí; nunca se escribe a mano.
 */

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const CONFIRM_PROPS = {
  confirm: { type: "boolean", description: "true para ejecutar un plan ya generado" },
  action_id: { type: "string", description: "id del plan pendiente (devuelto en la primera llamada)" },
};

export const MCP_TOOLS: McpToolDef[] = [
  /* ============================ TOOLS PÚBLICAS ============================ */
  /* Marketing — sin datos privados. Accesibles con token public o sin auth.  */
  {
    name: "getting_started",
    description:
      "PÚBLICA: qué es VForge y cómo conectarse. README vivo — explica la fábrica de apps, qué hace el agente V, cómo obtener un token MCP y empezar. No expone datos privados.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_method",
    description:
      "PÚBLICA: el Método VForge resumido — las 3 capas, los anillos de privilegio y el stack validado con el que VForge construye y opera apps. No expone datos privados.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "help",
    description:
      "PÚBLICA: lista las tools del MCP de VForge, qué hace cada una y qué scope necesita (público / con token). Punto de entrada para orientarse. No expone datos privados.",
    inputSchema: { type: "object", properties: {} },
  },

  /* ============================== TOOLS DE DATOS ============================== */
  {
    name: "vforge_brain_search",
    description:
      "Busca en la memoria y el método de VForge (knowledge base + memoria semántica): el método de construcción, decisiones de arquitectura, lecciones, runbooks. Devuelve resultados curados por categoría y, si hace falta, fragmentos semánticos.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Qué buscar" } }, required: ["query"] },
  },
  {
    name: "vforge_skill_list",
    description: "Lista las skills (capacidades/flujos) disponibles en VForge con su descripción.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_integration_plan",
    description:
      "Dado el alcance de un proyecto (tipo de app y features), recomienda qué servicios/cuentas conectar (GitHub, Vercel, Stripe, Neon, etc.) con porqué, costo aproximado, pasos de cuenta y llave necesaria por servicio.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Tipo de app (ecommerce, servicios, comunidad, etc.)" },
        features: { type: "array", items: { type: "string" }, description: "Features: pagos, emails, base de datos, sms, auth, mapa…" },
      },
    },
  },
  {
    name: "vforge_recommend_stack",
    description: "Recomienda el stack técnico validado de VForge (Next.js + TS + Tailwind + Clerk + Neon + Vercel) con justificación por pieza, alternativas y cuándo NO usar cada una.",
    inputSchema: { type: "object", properties: { type: { type: "string" } } },
  },
  {
    name: "vforge_project_status",
    description: "DATOS (admin|client): estado de los proyectos en VForge. Admin (operador) ve todos; client ve SOLO los de su org_id. Aislado por tenant.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_project_feedback",
    description:
      "DATOS (admin|client): lee las observaciones/anotaciones de una sala live (texto, ancla viewport/selector/URL y estado de la tarea). Exige project_id y valida que el token sea owner del tenant o miembro activo del proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "ID exacto del proyecto cuya sala se quiere revisar (por ejemplo: apsus)",
        },
        limit: {
          type: "number",
          description: "Cantidad de observaciones recientes (1-100; default 40)",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vforge_project_context",
    description:
      "DATOS (admin|client): estado de código/deploy, URLs de referencia con contenido leído, CONTENIDO.md, integraciones sin secretos y archivos privados de una sala autorizada.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID exacto del proyecto" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vforge_project_file",
    description:
      "DATOS (admin|client): lee por fragmentos el texto extraído de un ZIP privado de contexto. Revalida acceso al proyecto y nunca devuelve la URL privada del blob.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID exacto del proyecto" },
        asset_id: { type: "string", description: "ID del archivo listado por vforge_project_context" },
        offset: { type: "number", description: "Posición inicial en caracteres (default 0)" },
        limit: { type: "number", description: "Caracteres por fragmento (1-40000; default 20000)" },
      },
      required: ["project_id", "asset_id"],
    },
  },
  {
    name: "vforge_project_see",
    description:
      "OJOS (admin|client): fotografía Escritorio/Móvil/Admin, guarda cada foto como documento de la sala y las devuelve. También incluye fotos del plugin de Chrome. Usa project_id y viewport=desktop|mobile|admin|all.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID exacto del proyecto (por ejemplo: netmas-distribuidores)" },
        viewport: {
          type: "string",
          description: "desktop, mobile, admin o all. Default: desktop y mobile",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vforge_navegador_see",
    description:
      "OJOS (admin): fotografía la pestaña ABIERTA del Navegador Pro en Hetzner. Lo que está en el Chrome de la nube, no un Chrome aislado.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_payments",
    description: "DATOS (admin|client): pagos y avance financiero (total/pagado/pendiente) de los proyectos. Admin ve todo; client ve SOLO su org_id. Aislado por tenant.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_apps_health",
    description: "DATOS (admin|client): salud/estado de despliegue de las apps (live/building/error/idle). Admin ve todo; client ve SOLO su org_id. Aislado por tenant.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vforge_create_repo",
    description:
      "EJECUTABLE (two-step): crea un repositorio GitHub real con el token del usuario. Primera llamada sin confirm devuelve un plan + action_id; segunda llamada con confirm=true y action_id lo ejecuta.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del repo" },
        description: { type: "string" },
        private: { type: "boolean", description: "Repo privado (default true)" },
        ...CONFIRM_PROPS,
      },
    },
  },
  {
    name: "vforge_deploy",
    description:
      "EJECUTABLE (two-step): crea/conecta un proyecto Vercel a un repo GitHub y dispara un deployment con el token Vercel del usuario. Primera llamada sin confirm devuelve plan + action_id; con confirm=true ejecuta y devuelve la URL.",
    inputSchema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string", description: "owner/repo en GitHub" },
        project_name: { type: "string", description: "Nombre del proyecto Vercel (default: nombre del repo)" },
        ...CONFIRM_PROPS,
      },
    },
  },
  {
    name: "vforge_scaffold_project",
    description:
      "EJECUTABLE (two-step): andamiaje completo de proyecto — crea repo GitHub + proyecto Vercel conectado y lista las integraciones recomendadas pendientes de conectar. Two-step: plan primero, confirm=true para ejecutar.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del proyecto" },
        scope: {
          type: "object",
          properties: {
            appType: { type: "string" },
            features: { type: "array", items: { type: "string" } },
          },
        },
        ...CONFIRM_PROPS,
      },
    },
  },
  {
    name: "vforge_execute_skill",
    description:
      "EJECUTABLE (two-step, solo owner): ejecuta una skill de VForge vía Claude Code en el servidor. Busca la skill por nombre, arma el prompt con su system_prompt + instrucciones y lo dispara. Plan primero, confirm=true para ejecutar.",
    inputSchema: {
      type: "object",
      properties: {
        skill_name: { type: "string", description: "Nombre (o parte) de la skill" },
        instructions: { type: "string", description: "Instrucciones adicionales" },
        ...CONFIRM_PROPS,
      },
    },
  },

  /* ===================== TOOLS DE OPERADOR (fragua Vulcano) ===================== */
  /* Owner/Associate (admin|client). NUNCA public. Ver OPERATOR_TOOLS en rbac.ts. */
  {
    name: "vulcano_taller_status",
    description:
      "OPERADOR (Owner/Associate): estado vivo de la fragua — qué está pasando AHORA en la empresa. Jobs corriendo, en cola y cerrados recientemente desde la cola real de despacho (dispatch_queue): agente, source, progreso, log en vivo y veredicto Grok (APROBADO/RECHAZADO/REVISION). Sin mock.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vulcano_dispatch",
    description:
      "OPERADOR (Owner/Associate, ejecuta directo): encola un trabajo REAL a la fragua (INSERT en dispatch_queue). El source queda auditado como mcp:<tu userId de Clerk> — registro de quién ordenó qué. Devuelve el id de cola asignado.",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string", description: "Agente que ejecuta: claude | codex | grok | shell | browser (default claude)" },
        prompt: { type: "string", description: "La tarea a ejecutar en la fragua" },
        priority: { type: "number", description: "Prioridad 1-100 (más alto = antes; default 5)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "vulcano_brain_module",
    description:
      "OPERADOR (Owner/Associate): lee un módulo de arranque del Brain por nombre — la doctrina completa de la fábrica. Módulos: proposito, contexto-minimo, marco-legal-entrega, publicidad, tipos-de-diseno, catalogo-forks, anatomia-arte, onboarding-operador. Sin 'name' lista los disponibles.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del módulo (ej. proposito). Vacío = lista los módulos." },
      },
    },
  },
  {
    name: "vulcano_salud",
    description:
      "OPERADOR (Owner/Associate): el pulso de la fábrica en una sola llamada — token-health (horas restantes), daemon Vulcano vivo + claude_loop, y conteo de la cola (corriendo/pendiente/total). Sin mock.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vulcano_boot",
    description:
      "AGENTE (Owner): arranque de identidad Vulcano — carga boot-context, proyectos activos, lecciones recientes y ritual de identidad en una sola llamada. LLAMAR PRIMERO al iniciar cualquier sesión de agente autónomo.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vulcano_brain_exec",
    description:
      "OPERADOR (Owner): ejecuta un comando shell en el servidor Hetzner desde el MCP. Auditado. Blocklist básica activa. project_id opcional para auto-registrar lección.",
    inputSchema: {
      type: "object",
      properties: {
        cmd: { type: "string", description: "Comando bash a ejecutar en Hetzner" },
        project_id: { type: "string", description: "ID de proyecto para registrar lección (opcional)" },
      },
      required: ["cmd"],
    },
  },
  {
    name: "v_instruct",
    description:
      "OPERADOR (Owner): da una instrucción directa a V, el cerebro orquestador. V detecta el intent y, si aplica, despacha al agente correcto (Vulcano/Tanit/Breack/Goossip/Enjambre) encolando el job real en dispatch_queue; si no, responde ella misma. Es el canal Claude → V → agentes.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "La instrucción o mensaje para V, en lenguaje natural." },
        session_id: { type: "string", description: "Sesión de V (default: claude-mcp). Aísla la memoria conversacional." },
      },
      required: ["message"],
    },
  },
  {
    name: "vulcano_brain_query",
    description:
      "OPERADOR (Owner): ejecuta SQL en Neon (Brain DB) desde el MCP. Permite SELECT libre + INSERT en lessons/patterns + UPDATE en projects/dispatch_queue.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL a ejecutar" },
        params: { type: "array", description: "Parámetros posicionales ($1, $2…)", items: {} },
      },
      required: ["query"],
    },
  },
  {
    name: "vulcano_update_project",
    description:
      "AGENTE (Owner): actualiza el estado de un proyecto en el Brain (last_action, next_step, phase, blocked). Llamar siempre al terminar una tarea sobre un proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID del proyecto (ej. rideme, credeti, vforge)" },
        last_action: { type: "string", description: "Resumen de lo que se hizo" },
        next_step: { type: "string", description: "Qué sigue" },
        phase: { type: "string", description: "Fase actual del proyecto (opcional)" },
        blocked: { type: "string", description: "Blocker activo, o cadena vacía para limpiar (opcional)" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "vulcano_save_lesson",
    description:
      "AGENTE (Owner): persiste una lección, error o patrón aprendido en el Brain. Llamar siempre que descubras algo reutilizable.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID de proyecto relacionado (default: general)" },
        type: { type: "string", enum: ["acierto", "error", "patron"], description: "Tipo de lección" },
        area: { type: "string", description: "Área técnica: shell | postgres | pwa | auth | deploy | etc." },
        lesson: { type: "string", description: "La lección en sí (qué aprendiste)" },
        fix: { type: "string", description: "Cómo resolverlo si era un error (opcional)" },
        source: { type: "string", description: "Fuente (default: mcp-agent)" },
      },
      required: ["lesson"],
    },
  },
  {
    name: "vulcano_memory_search",
    description:
      "AGENTE (Owner): búsqueda semántica en el Brain (pgvector + Jina embeddings). Encuentra doctrina, patrones, skills y contexto por significado, no por ruta exacta.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Pregunta en lenguaje natural" },
        limit: { type: "number", description: "Resultados (default: 5, max: 10)" },
      },
      required: ["q"],
    },
  },

];
