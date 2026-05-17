export type Locale = "es" | "en";

export const locales: Locale[] = ["es", "en"];
export const defaultLocale: Locale = "es";

export type Dictionary = {
  common: Record<string, string>;
  marketing: {
    hero_eyebrow: string;
    hero_title_a: string;
    hero_title_b: string;
    hero_title_c: string;
    hero_subtitle: string;
    hero_cta_primary: string;
    hero_cta_secondary: string;
    hero_trust: string;
    problem_eyebrow: string;
    problem_title: string;
    problem_body: string;
    problem_items: string[];
    capabilities_eyebrow: string;
    capabilities_title: string;
    capabilities_subtitle: string;
    capabilities_items: { title: string; body: string }[];
    how_eyebrow: string;
    how_title: string;
    how_body: string;
    how_steps: { title: string; body: string }[];
    workspace_eyebrow: string;
    workspace_title: string;
    workspace_body: string;
    workspace_bullets: string[];
    workspace_cta: string;
    cta_eyebrow: string;
    cta_title: string;
    cta_body: string;
    cta_primary: string;
    cta_secondary: string;
    footer_tagline: string;
    footer_platform: string;
    footer_company: string;
    footer_about: string;
    footer_manifesto: string;
    footer_security: string;
    footer_contact: string;
    footer_legal: string;
    footer_system: string;
  };
  auth: Record<string, string>;
  onboarding: {
    step_progress: string;
    welcome_title: string;
    welcome_body: string;
    welcome_cta: string;
    profile_title: string;
    profile_body: string;
    profile_name_label: string;
    profile_name_placeholder: string;
    profile_role_label: string;
    profile_roles: string[];
    connect_title: string;
    connect_body: string;
    label_recommended: string;
    label_connected: string;
    project_title: string;
    project_body: string;
    project_name_label: string;
    project_name_placeholder: string;
    project_intent_label: string;
    project_intent_placeholder: string;
    project_b_note: string;
    summary_title_named: string;
    summary_title_anon: string;
    summary_body: string;
    summary_connected: string;
    summary_ready: string;
    summary_later: string;
    summary_project_fallback: string;
    enter_workspace: string;
    integrations: Record<
      "github" | "vercel" | "domains" | "neon" | "stripe" | "twilio" | "maps",
      { name: string; blurb: string; glossary: string }
    >;
    glossary_label: string;
  };
  glossary: {
    eyebrow: string;
    title: string;
    body: string;
    cta_primary: string;
    cta_secondary: string;
    terms: { title: string; body: string; examples: string[] }[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    body: string;
    most_chosen: string;
    talk_to_us_pre: string;
    talk_to_us_link: string;
    plans: { name: string; price: string; cadence: string; blurb: string; features: string[]; cta: string }[];
  };
  marketplace: {
    eyebrow: string;
    title_public: string;
    body_public: string;
    title_workspace: string;
    body_workspace: string;
    search_placeholder: string;
    ask_b_title: string;
    ask_b_body: string;
    categories: string[];
    modules: Record<
      "clerk" | "stripe" | "twilio" | "maps" | "neon" | "vision" | "mail" | "storage" | "vercel" | "domains" | "agent" | "audit",
      { name: string; category: string; blurb: string }
    >;
  };
  workspace: {
    nav: Record<
      "chat" | "repovision" | "deployments" | "marketplace" | "integrations" | "secrets" | "projects" | "activity" | "hub" | "settings" | "help",
      string
    >;
    quick_command: string;
    workspace_label: string;
    b_ready: string;
    b_insights_label: string;
    b_insights_body: string;
    breadcrumb_app: string;
    mobile_labels: Record<"b" | "deploy" | "projects" | "vault" | "alerts", string>;
  };
  chat: {
    intro: string;
    operator_label: string;
    placeholder: string;
    shift_enter_hint: string;
    send: string;
    thinking: string;
    quick_prompts: string[];
    b_response_text: string;
    b_response_actions: string[];
    ops: {
      title: string;
      build: string;
      errors: string;
      deploys: string;
      modules: string;
      recent: string;
      events: string[];
      suggest_label: string;
      suggest_body: string;
    };
  };
  repovision: {
    eyebrow: string;
    title: string;
    body: string;
    cta_connect: string;
    cta_refactor: string;
    open_prs: string;
    open: string;
    last_deploy: string;
    recent_commits: string;
  };
  deployments: {
    eyebrow: string;
    title: string;
    body: string;
    open_vercel: string;
    promote: string;
    stats: { healthy: string; avg_build: string; released_today: string; failed_7d: string };
    table: { deploy: string; project: string; env: string; commit: string; build: string; status: string; when: string };
  };
  integrations: {
    eyebrow: string;
    title: string;
    body: string;
    cta_connect_new: string;
    manage: string;
  };
  secrets: {
    eyebrow: string;
    title: string;
    body: string;
    rotate_all: string;
    add: string;
    stats: { encrypted: string; rotations: string; audit: string; stale: string };
    sealed: string;
    list_label: string;
  };
  projects: {
    eyebrow: string;
    title: string;
    body: string;
    cta_import: string;
    cta_new: string;
    stats: { modules: string; team: string; last_deploy: string; repo: string };
    ask_b: string;
    open: string;
  };
  activity: { eyebrow: string; title: string; body: string; export: string };
  hub: {
    eyebrow: string;
    title: string;
    body: string;
    featured: string;
    manifesto_title: string;
    manifesto_body: string;
    read_essay: string;
    learning: string;
    learning_items: string[];
    templates: string;
    templates_body: string;
    browse_all: string;
    community: string;
    community_body: string;
    open_discord: string;
    tips: string;
    tips_items: string[];
    forge_news_title: string;
    forge_news_body: string;
    summarize: string;
    support: string;
    support_body: string;
    contact: string;
  };
  settings: {
    eyebrow: string;
    title: string;
    body: string;
    sections: { title: string; body: string }[];
    open: string;
  };
  not_found: { code: string; title: string; body: string; back: string; open_workspace: string };
  offline: { title: string; body: string; open_shell: string };
};

export const es: Dictionary = {
  common: {
    cta_get_access: "Obtener acceso",
    cta_sign_in: "Iniciar sesión",
    cta_get_started: "Empezar",
    cta_continue: "Continuar",
    cta_back: "Atrás",
    cta_open: "Abrir",
    cta_close: "Cerrar",
    cta_connect: "Conectar",
    cta_install: "Instalar",
    cta_configure: "Configurar",
    cta_manage: "Gestionar →",
    cta_approve: "Aprobar",
    cta_later: "Luego",
    cta_demo: "Ver demo",
    cta_pricing: "Ver precios",
    cta_ask_b: "Pregúntale a V",
    nav_product: "Producto",
    nav_workspace: "Workspace",
    nav_marketplace: "Marketplace",
    nav_glossary: "Glosario",
    nav_pricing: "Precios",
    status_live: "live",
    status_preview: "preview",
    status_draft: "borrador",
    status_healthy: "operativo",
    status_degraded: "degradado",
    status_pending: "pendiente",
    status_ready: "listo",
    status_building: "construyendo",
    status_failed: "falló",
    status_done: "hecho",
    status_running: "en curso",
    status_queued: "en cola",
    status_installed: "instalado",
    status_available: "disponible",
    label_b_picks: "elección de V",
    label_b: "V",
    label_operator: "Operador",
    theme_toggle_aria: "Cambiar tema",
    locale_toggle_aria: "Cambiar idioma",
  },
  marketing: {
    hero_eyebrow: "Te presentamos a V — tu operador de IA",
    hero_title_a: "Construye y opera",
    hero_title_b: "productos completos",
    hero_title_c: "con una conversación.",
    hero_subtitle:
      "VForge es un workspace operativo nativo de IA. Genera frontend y backend, gestiona repositorios, despliega infraestructura, conecta integraciones, secretos y dominios — todo orquestado por V, tu operador conversacional.",
    hero_cta_primary: "Empezar con V",
    hero_cta_secondary: "Ver el recorrido",
    hero_trust: "Sin tarjeta · GitHub · Vercel · Clerk · Stripe · Twilio · Mapas",
    problem_eyebrow: "El problema",
    problem_title: "La infraestructura moderna es brillante — y brutalmente fragmentada.",
    problem_body:
      "No deberías necesitar ser ingeniero de DevOps para lanzar un producto hermoso. VForge reemplaza el cementerio de dashboards con una superficie conversacional que opera todo por ti.",
    problem_items: [
      "Glue-code entre CLIs y dashboards",
      "Stack fragmentado entre 9+ proveedores",
      ".env filtrados en Slack",
      "Flujos OAuth que nadie entiende",
      "Drift entre staging y producción",
      "Deploys que requieren reuniones",
    ],
    capabilities_eyebrow: "Lo que V puede hacer",
    capabilities_title: "Un operador. Todo el stack.",
    capabilities_subtitle:
      "Habla con naturalidad. V traduce la intención en una ejecución coordinada por toda la superficie de tu producto — código, infra, servicios, secretos.",
    capabilities_items: [
      { title: "Generación de frontend", body: "UIs Next.js + Tailwind a partir de la intención. Componentes, ruteo y design system heredados." },
      { title: "Generación de backend", body: "APIs, jobs, colas, auth y persistencia creados en sintonía con el frontend." },
      { title: "Deployments", body: "Pipelines nativos de Vercel. Previews, producción y rollbacks — a una frase de distancia." },
      { title: "Integraciones", body: "Stripe, Twilio, Clerk, Maps, AI Vision. Instaladas, configuradas y monitoreadas." },
      { title: "Bóveda de secretos", body: "Credenciales cifradas con scopes por proyecto, rotaciones y trazabilidad." },
      { title: "Dominios", body: "Compra, vincula y certifica dominios conversacionalmente con guía DNS incluida." },
      { title: "Bases de datos", body: "Aprovisiona y migra Neon, Postgres, Redis. Diffs de esquema en lenguaje claro." },
      { title: "Automatizaciones", body: "Cron, webhooks y workflows orientados a eventos orquestados entre servicios." },
      { title: "Marketplace de módulos", body: "Instala capacidades en cualquier proyecto. Componibles, removibles, auditables." },
    ],
    how_eyebrow: "Cómo funciona",
    how_title: "De la frase al deploy — en un flujo continuo.",
    how_body:
      "VForge no es un chatbot. Es un operador con privilegios sobre tu infraestructura, sujeto a tus aprobaciones, guardrails y confirmaciones visuales.",
    how_steps: [
      { title: "1. Describe el producto", body: "Cuéntale a V qué quieres construir. Sin tickets ni specs — sólo intención." },
      { title: "2. V traza el sistema", body: "Arquitectura, pantallas, servicios e integraciones propuestos con previews." },
      { title: "3. Apruebas y conectas", body: "Onboarding guiado para GitHub, Vercel, Stripe, Twilio. Visual, amable y seguro." },
      { title: "4. VForge opera", body: "Deploys, rotaciones, escalado y respuesta a incidentes — todo desde una conversación serena." },
    ],
    workspace_eyebrow: "El Workspace",
    workspace_title: "Un sistema operativo sereno para tu producto.",
    workspace_body:
      "El centro de VForge es V. A la izquierda, tu navegación por RepoVision, Deployments, Marketplace, Secretos y Dominios. A la derecha, un panel operativo en vivo con el pulso de tu producto en tiempo real.",
    workspace_bullets: [
      "· Dark cinemático, glassmorfismo premium y acentos violeta/cian.",
      "· Superficie principal conversacional — nunca abrumado por la infra.",
      "· Confirmaciones visuales, nunca archivos de config en la cara.",
    ],
    workspace_cta: "Entrar al workspace",
    cta_eyebrow: "Comienza",
    cta_title: "Deja de ensamblar herramientas. Opera un producto.",
    cta_body:
      "Tu stack, tus dominios, tus secretos, tus deploys — orquestados por V en un solo workspace conversacional.",
    cta_primary: "Crea tu VForge",
    cta_secondary: "Ver precios",
    footer_tagline:
      "VForge es un workspace operativo nativo de IA. Construye, despliega y orquesta cada servicio de tu producto con una sola conversación con V.",
    footer_platform: "Plataforma",
    footer_company: "Empresa",
    footer_about: "Sobre nosotros",
    footer_manifesto: "Manifiesto",
    footer_security: "Seguridad",
    footer_contact: "Contacto",
    footer_legal: "© {year} VForge — Opera el futuro, conversacionalmente.",
    footer_system: "Zenith Forge System · v0.1",
  },
  auth: {
    sign_in_title: "Vuelve a tu forja.",
    sign_in_subtitle:
      "V te espera. Retoma conversaciones, audita deploys recientes, rota secretos — todo desde una superficie serena.",
    sign_up_title: "Crea un producto en una sola conversación.",
    sign_up_subtitle:
      "Te guiaremos para conectar tu ecosistema — GitHub, Vercel, pagos, dominios — con confirmaciones visuales en cada paso.",
    sign_in_eyebrow: "Workspace de grado operador",
    sign_up_eyebrow: "Empieza con V",
    have_no_account: "¿No tienes acceso? Regístrate →",
    have_account: "¿Ya tienes acceso? Inicia sesión →",
    sso_github: "Continuar con GitHub",
    sso_google: "Continuar con Google",
    separator_or: "o",
    email_placeholder: "tú@studio.com",
    password_placeholder: "••••••••",
    placeholder_disabled_note:
      "La autenticación está impulsada por Clerk. Añade NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY para habilitar el flujo completo.",
    enter_vforge: "Entrar a VForge",
  },
  onboarding: {
    step_progress: "Onboarding · paso {current} / {total}",
    welcome_title: "Hola. Soy V.",
    welcome_body:
      "Seré tu operador. Juntos conectaremos algunos servicios, y luego empezaré a construir tu primer producto. Tómate tu tiempo — cada acción es tuya para aprobar.",
    welcome_cta: "Comencemos",
    profile_title: "Cuéntame sobre ti",
    profile_body: "Esto define cómo te hablaré, cómo te explicaré las cosas y qué priorizaré.",
    profile_name_label: "Tu nombre",
    profile_name_placeholder: "p. ej. Camila",
    profile_role_label: "Tu rol",
    profile_roles: ["Fundador", "Ingeniero", "Diseñador", "Operador", "Hobbyista"],
    connect_title: "Conecta tu ecosistema",
    connect_body:
      "Te guiaré por cada uno. Puedes omitir cualquier servicio y conectarlo después desde el Marketplace.",
    label_recommended: "Recomendado",
    label_connected: "Conectado",
    project_title: "Tu primer proyecto",
    project_body:
      "Dale un nombre y cuéntame qué quieres construir. Trazaré la arquitectura para tu aprobación dentro del workspace.",
    project_name_label: "Nombre del proyecto",
    project_name_placeholder: "p. ej. Orion Studio",
    project_intent_label: "¿Qué vamos a construir?",
    project_intent_placeholder:
      "Un SaaS para un pequeño estudio con reservas, pagos y recordatorios por SMS. UI dark premium. Mapas para la ubicación del estudio.",
    project_b_note:
      "Te propondré el stack dentro del workspace — frontend, backend, integraciones y plan de deploy. Tú apruebas, yo ejecuto.",
    summary_title_named: "Bienvenido, {name}.",
    summary_title_anon: "Bienvenido a bordo.",
    summary_body: "Tu workspace está listo. Empezaré por trazar {project}.",
    summary_connected: "Conectado",
    summary_ready: "listo",
    summary_later: "luego",
    summary_project_fallback: "tu proyecto",
    enter_workspace: "Entrar al workspace",
    integrations: {
      github: { name: "GitHub", blurb: "Aloja tu código y deja que V haga push por ti.", glossary: "GitHub guarda el código de tu proyecto en repositorios. VForge lo usa para leer, modificar y crear repositorios en tu nombre — con tu aprobación." },
      vercel: { name: "Vercel", blurb: "Despliega frontends, previews y edge functions al instante.", glossary: "Vercel convierte tu código en un sitio en vivo. Cada cambio genera una URL de preview; los deploys de producción salen con una aprobación tuya." },
      domains: { name: "Dominios", blurb: "Compra o conecta un dominio. V maneja el DNS.", glossary: "Un dominio es la dirección que los usuarios escriben para llegar a tu producto. VForge lo configura automáticamente y emite certificados SSL por ti." },
      neon: { name: "Base de datos", blurb: "Levanta Postgres en segundos con previews por rama.", glossary: "Una base de datos guarda los datos reales de tu producto — usuarios, pagos, archivos. Usamos Postgres serverless con branching para migraciones seguras." },
      stripe: { name: "Stripe", blurb: "Cobra a clientes, gestiona suscripciones, impuestos y reembolsos.", glossary: "Stripe maneja el dinero — suscripciones, pagos únicos, facturas. V configura productos, precios y webhooks por ti." },
      twilio: { name: "Twilio", blurb: "SMS, WhatsApp y notificaciones por voz.", glossary: "Twilio envía mensajes a tus usuarios — confirmaciones, alertas, códigos 2FA — por SMS, WhatsApp y voz." },
      maps: { name: "Mapas", blurb: "Geocoding, lugares y rutas para cualquier feature de ubicación.", glossary: "Los mapas permiten a tu producto mostrar ubicaciones, buscar direcciones y calcular rutas. Útil para delivery, inmobiliarias o apps sociales." },
    },
    glossary_label: "Glosario",
  },
  glossary: {
    eyebrow: "Glosario",
    title: "El vocabulario de operar un producto, en lenguaje claro.",
    body:
      "Cada término que te encontrarás en VForge, explicado sin jerga. Los mostramos inline durante el onboarding para que nunca estés perdido.",
    cta_primary: "Aprende haciendo — empieza gratis",
    cta_secondary: "Pregúntale a V lo que sea",
    terms: [
      { title: "Repositorio (GitHub)", body: "Una carpeta para tu código. GitHub aloja los repositorios para que varias personas (y V) puedan trabajar en el mismo código sin perder cambios.", examples: ["V escribe código en una rama.", "Tú apruebas los cambios.", "V hace merge y dispara un deploy."] },
      { title: "Deployment (Vercel)", body: "Convertir tu código en un sitio o API en vivo. Los previews aparecen al instante para cada cambio; producción sale con tu aprobación.", examples: ["URL de preview: project-pr-12.vercel.app", "Producción: forge.app"] },
      { title: "Dominio", body: "La dirección que los usuarios escriben para encontrar tu producto. V configura los registros DNS y los certificados SSL automáticamente.", examples: ["forge.app", "studio.forge.app"] },
      { title: "Secreto", body: "Un valor sensible (como un API key). Se guarda cifrado; sólo los servicios que lo necesitan pueden leerlo.", examples: ["STRIPE_SECRET_KEY", "DATABASE_URL"] },
      { title: "Integración", body: "Una conexión preconstruida a un servicio externo como Stripe o Twilio. V las instala, configura y monitorea.", examples: ["Stripe para pagos", "Twilio para SMS"] },
      { title: "Base de datos", body: "Donde viven los datos reales de tu producto — usuarios, órdenes, archivos. V se encarga de esquemas, migraciones y backups.", examples: ["Postgres en Neon", "Redis para caché"] },
      { title: "API", body: "Una puerta que tu frontend usa para pedirle cosas a tu backend. V expone APIs que coinciden con las features que describes.", examples: ["GET /api/bookings", "POST /api/stripe/checkout"] },
      { title: "Módulo", body: "Un paquete de capacidad — como Auth, Pagos, Mapas. Los módulos pueden instalarse o quitarse de un proyecto en cualquier momento.", examples: ["Clerk Auth", "Stripe Payments", "Google Maps"] },
      { title: "Entorno", body: "Un escenario aislado para tu producto. 'Development' es para ti, 'preview' para ramas, 'production' para usuarios reales.", examples: ["development", "preview", "production"] },
      { title: "Infraestructura", body: "Los servidores y servicios que hacen funcionar tu producto. Con VForge la operas conversacionalmente en vez de hacer clic en 9 dashboards.", examples: ["Servidores, colas, cachés, CDN, jobs"] },
      { title: "Webhook", body: "Una notificación enviada de un servicio a otro cuando algo pasa. Stripe le avisa a tu app cuando un pago tuvo éxito, por ejemplo.", examples: ["stripe.checkout.session.completed", "github.push"] },
      { title: "Suscripción", body: "Un pago recurrente que tus usuarios hacen para acceder a tu producto. V configura productos y precios en Stripe por ti.", examples: ["Plan Pro · $29/mes", "Plan Studio · $99/mes"] },
    ],
  },
  pricing: {
    eyebrow: "Construido como un OS, con precio de herramienta",
    title: "Opera un producto o un portafolio.",
    body: "Cada plan incluye a V, el operador conversacional. Sube de plan a medida que tu stack crece.",
    most_chosen: "El más elegido",
    talk_to_us_pre: "¿Necesitas un tier enterprise? ",
    talk_to_us_link: "Habla con nosotros",
    plans: [
      {
        name: "Solo",
        price: "$0",
        cadence: "/mes",
        blurb: "Para chispas iniciales. Construye con V, deploya con amigos.",
        features: ["1 proyecto", "V con cuota diaria", "Conexión GitHub + Vercel", "Marketplace comunitario", "Onboarding con glosario"],
        cta: "Empezar gratis",
      },
      {
        name: "Studio",
        price: "$29",
        cadence: "/mes",
        blurb: "Para fundadores y equipos pequeños que envían productos reales.",
        features: ["Proyectos ilimitados", "V con modelos prioritarios", "Dominios y SSL personalizados", "Bóveda de secretos con rotaciones", "Módulos Stripe, Twilio, Mapas", "Soporte por email e in-app"],
        cta: "Elegir Studio",
      },
      {
        name: "Forge",
        price: "$99",
        cadence: "/mes",
        blurb: "Para operadores con múltiples productos a escala.",
        features: ["Asientos y roles de equipo", "Auditoría y aprobaciones", "Módulos privados", "Deploys multi-región", "Políticas de secretos de org", "Ingeniero de éxito dedicado"],
        cta: "Elegir Forge",
      },
    ],
  },
  marketplace: {
    eyebrow: "Marketplace",
    title_public: "Capacidades, listas para componer.",
    body_public:
      "Cada módulo es configurado y operado por V. Auth, pagos, mensajería, IA, almacenamiento — instálalos conversacionalmente y quítalos cuando quieras.",
    title_workspace: "Instala capacidades. Compón tu producto.",
    body_workspace:
      "Bloques modulares para auth, pagos, mapas, IA, mensajería y más. V los instala y configura por ti.",
    search_placeholder: "Buscar módulos…",
    ask_b_title: "Pregúntale a V",
    ask_b_body:
      '"Necesito pagos." "Necesito auth." "Necesito mapas." — V elige e instala el módulo correcto para tu proyecto, lo configura y expone las APIs que necesitas.',
    categories: ["Todo", "Auth", "Pagos", "Mensajería", "Mapas", "Base de datos", "IA", "Email", "Archivos", "Deploy", "DNS", "Seguridad"],
    modules: {
      clerk: { name: "Clerk", category: "Auth", blurb: "Autenticación drop-in con SSO, MFA y orgs." },
      stripe: { name: "Stripe", category: "Pagos", blurb: "Suscripciones, pagos únicos, impuestos y facturas." },
      twilio: { name: "Twilio", category: "Mensajería", blurb: "SMS, WhatsApp y notificaciones por voz." },
      maps: { name: "Google Maps", category: "Mapas", blurb: "Geocoding, lugares y rutas." },
      neon: { name: "Neon Postgres", category: "Base de datos", blurb: "Postgres serverless con branching." },
      vision: { name: "AI Vision", category: "IA", blurb: "Comprensión de imágenes para moderación, OCR, captioning." },
      mail: { name: "Resend", category: "Email", blurb: "Email transaccional con deliverability integrada." },
      storage: { name: "Almacenamiento", category: "Archivos", blurb: "Almacenamiento de objetos con URLs firmadas y CDN." },
      vercel: { name: "Vercel", category: "Deploy", blurb: "Deploys edge, previews y analytics." },
      domains: { name: "Dominios", category: "DNS", blurb: "Registra, vincula y certifica dominios." },
      agent: { name: "Operator Bots", category: "IA", blurb: "Personalidades de V custom para flujos específicos." },
      audit: { name: "Bóveda de auditoría", category: "Seguridad", blurb: "Logs a prueba de manipulación e informes SOC2." },
    },
  },
  workspace: {
    nav: {
      chat: "Hablar con V",
      repovision: "RepoVision",
      deployments: "Deployments",
      marketplace: "Marketplace",
      integrations: "Integraciones",
      secrets: "Bóveda de secretos",
      projects: "Proyectos",
      activity: "Actividad",
      hub: "Hub",
      settings: "Ajustes",
      help: "Ayuda",
    },
    quick_command: "Comando rápido",
    workspace_label: "Workspace",
    b_ready: "V · listo",
    b_insights_label: "Insights de V",
    b_insights_body: "La latencia de forge.app bajó 12% tras el último deploy.",
    breadcrumb_app: "app",
    mobile_labels: {
      b: "V",
      deploy: "Deploy",
      projects: "Proyectos",
      vault: "Bóveda",
      alerts: "Alertas",
    },
  },
  chat: {
    intro:
      "Hola — soy V. Cuéntame qué quieres construir, o pídeme que opere algo. Puedo crear proyectos, configurar integraciones, deployar y correr auditorías.",
    operator_label: "Operador · listo · forge.app",
    placeholder: "Pide a V construir, deployar, conectar u operar cualquier cosa…",
    shift_enter_hint: "Shift + Enter para nueva línea",
    send: "Enviar",
    thinking: "V está pensando…",
    quick_prompts: [
      "Crear un SaaS para reservas",
      "Añadir Stripe a 'Orion Studio'",
      "Rotar todos los secretos en producción",
      "Conectar el dominio forge.app",
    ],
    b_response_text:
      "Entendido. Estoy trazando un plan y encolando las acciones. Te pediré aprobación para cualquier cosa que toque producción.",
    b_response_actions: [
      "Crear frontend Next.js",
      "Generar API REST + esquema Postgres",
      "Configurar checkout de Stripe",
      "Deployar preview en Vercel",
    ],
    ops: {
      title: "Operaciones en vivo",
      build: "Build",
      errors: "Errores",
      deploys: "Deploys",
      modules: "Módulos",
      recent: "Eventos recientes",
      events: [
        "repo · auth-service actualizado",
        "db · neon-prod migrado",
        "domain · forge.app vinculado",
        "deploy · pr-12 preview listo",
      ],
      suggest_label: "V sugiere",
      suggest_body: "¿Añadir backups nocturnos automáticos de Postgres a orion-prod?",
    },
  },
  repovision: {
    eyebrow: "RepoVision",
    title: "Todos los repositorios, todos los entornos, una sola vista.",
    body: "Supervisión visual del código que mueve tus productos. V escribe; tú conservas el control.",
    cta_connect: "Conectar repo",
    cta_refactor: "Pide a V que refactorice",
    open_prs: "{count} PRs abiertos",
    open: "Abrir",
    last_deploy: "deploy · {time}",
    recent_commits: "Commits recientes",
  },
  deployments: {
    eyebrow: "Deployments",
    title: "Cada release, cada preview, narrado.",
    body: "Deploys conversacionales con V. Aprueba producción, mira los builds, rollback al instante.",
    open_vercel: "Abrir Vercel",
    promote: "Promover preview",
    stats: { healthy: "Operativo", avg_build: "Build promedio", released_today: "Releases hoy", failed_7d: "Fallidos (7d)" },
    table: { deploy: "Deploy", project: "Proyecto", env: "Entorno", commit: "Commit", build: "Build", status: "Estado", when: "Cuándo" },
  },
  integrations: {
    eyebrow: "Integraciones",
    title: "El tejido conectivo de tu stack.",
    body: "Estado en vivo, scopes, webhooks y rotaciones de cada servicio conectado. V repara lo que puede; te pide lo demás.",
    cta_connect_new: "Conectar nueva",
    manage: "Gestionar →",
  },
  secrets: {
    eyebrow: "Bóveda de secretos",
    title: "Credenciales cifradas, rotaciones conversacionales.",
    body: "Cada valor sellado en reposo y en tránsito. V rota, audita y te avisa antes de que cualquier valor expire.",
    rotate_all: "Rotar todos",
    add: "Añadir secreto",
    stats: { encrypted: "Cifrado en reposo", rotations: "Rotaciones (30d)", audit: "Eventos de auditoría", stale: "Obsoletos (> 90d)" },
    sealed: "sellado",
    list_label: "Secretos",
  },
  projects: {
    eyebrow: "Proyectos",
    title: "Cada producto que operas, de un vistazo.",
    body: "Lanza nuevos productos conversacionalmente con V, o gestiona los ya enviados.",
    cta_import: "Importar existente",
    cta_new: "Forjar nuevo",
    stats: { modules: "Módulos", team: "Equipo", last_deploy: "Último deploy", repo: "Repos" },
    ask_b: "Pregúntale a V sobre {name} →",
    open: "Abrir",
  },
  activity: {
    eyebrow: "Actividad",
    title: "La historia narrada de tu producto.",
    body:
      "Un feed cronológico único con todo lo que V hace, lo que cambia y lo que necesita tu atención.",
    export: "Exportar · CSV",
  },
  hub: {
    eyebrow: "Hub",
    title: "Un lugar sereno para ideas, conocimiento y comunidad.",
    body: "Plantillas de otros operadores, rutas de aprendizaje y lo último de V.",
    featured: "Destacado",
    manifesto_title: '"Opera, no orquestes."',
    manifesto_body:
      "Un breve manifiesto sobre por qué la infraestructura debe desaparecer, y por qué tu producto merece una sola superficie serena.",
    read_essay: "Leer el ensayo",
    learning: "Rutas de aprendizaje",
    learning_items: ["Construye tu primer SaaS en 20 minutos", "Conecta un dominio con DNSSEC", "Modelar suscripciones con Stripe"],
    templates: "Plantillas",
    templates_body: "Reservas de estudio · Marketplace · Herramienta interna · PWA mobile-first.",
    browse_all: "Explorar todo",
    community: "Comunidad",
    community_body: "Builders compartiendo recetas operativas, módulos y post-mortems.",
    open_discord: "Abrir Discord",
    tips: "Tips de V esta semana",
    tips_items: ["· Usa 'preview' para migraciones arriesgadas.", "· Pídele a V una auditoría mensual.", "· Rota API keys con una sola frase."],
    forge_news_title: "Lo último de la Forja",
    forge_news_body:
      "Nuevo: Operator Bots, Bóveda de auditoría, módulo AI Vision · Estamos contratando · Drop de keynote.",
    summarize: "Pide a V un resumen",
    support: "Soporte",
    support_body: "Abre un hilo con un ingeniero real. Mayoría de respuestas en menos de 4h.",
    contact: "Contactar soporte",
  },
  settings: {
    eyebrow: "Ajustes",
    title: "Afina VForge a tu estilo.",
    body: "Todo lo que define cómo V trabaja para ti.",
    sections: [
      { title: "Perfil", body: "Tu nombre, rol, zona horaria y avatar." },
      { title: "Apariencia", body: "Cinematic dark y day mode premium con toggle. Controles de intensidad de acentos." },
      { title: "Notificaciones", body: "Dónde avisarte cuando V necesite aprobación." },
      { title: "Seguridad", body: "MFA, dispositivos, SSO y políticas de sesión." },
      { title: "Tokens", body: "Tokens personales para acceso por CLI y CI/CD." },
      { title: "Facturación", body: "Plan, facturas y asientos." },
    ],
    open: "Abrir",
  },
  not_found: {
    code: "404 · deriva",
    title: "Nada que operar por aquí.",
    body: "Esa ruta no existe — todavía. Pídele a V y la forjamos.",
    back: "Volver al inicio",
    open_workspace: "Abrir el workspace",
  },
  offline: {
    title: "Estás offline.",
    body:
      "V sigue aquí — la cáscara del workspace está en caché. Retomaremos operaciones en vivo en cuanto vuelvas a estar online.",
    open_shell: "Abrir cáscara offline",
  },
};

export const en: Dictionary = {
  common: {
    cta_get_access: "Get access",
    cta_sign_in: "Sign in",
    cta_get_started: "Get started",
    cta_continue: "Continue",
    cta_back: "Back",
    cta_open: "Open",
    cta_close: "Close",
    cta_connect: "Connect",
    cta_install: "Install",
    cta_configure: "Configure",
    cta_manage: "Manage →",
    cta_approve: "Approve",
    cta_later: "Later",
    cta_demo: "Watch demo",
    cta_pricing: "See pricing",
    cta_ask_b: "Ask V",
    nav_product: "Product",
    nav_workspace: "Workspace",
    nav_marketplace: "Marketplace",
    nav_glossary: "Glossary",
    nav_pricing: "Pricing",
    status_live: "live",
    status_preview: "preview",
    status_draft: "draft",
    status_healthy: "healthy",
    status_degraded: "degraded",
    status_pending: "pending",
    status_ready: "ready",
    status_building: "building",
    status_failed: "failed",
    status_done: "done",
    status_running: "running",
    status_queued: "queued",
    status_installed: "installed",
    status_available: "available",
    label_b_picks: "V picks",
    label_b: "V",
    label_operator: "Operator",
    theme_toggle_aria: "Toggle theme",
    locale_toggle_aria: "Change language",
  },
  marketing: {
    hero_eyebrow: "Introducing V — your AI operator",
    hero_title_a: "Build and operate complete",
    hero_title_b: "products",
    hero_title_c: "through conversation.",
    hero_subtitle:
      "VForge is an AI-native operational workspace. Generate frontend and backend, manage repositories, deploy infrastructure, connect integrations, secrets and domains — all orchestrated by V, your conversational operator.",
    hero_cta_primary: "Start with V",
    hero_cta_secondary: "Watch the tour",
    hero_trust: "No credit card · GitHub · Vercel · Clerk · Stripe · Twilio · Maps",
    problem_eyebrow: "The problem",
    problem_title: "Modern infrastructure is brilliant — and brutally fragmented.",
    problem_body:
      "You shouldn’t need to be a DevOps engineer to ship a beautiful product. VForge replaces the dashboard graveyard with a single conversational surface that operates everything on your behalf.",
    problem_items: [
      "Glue-coding CLIs and dashboards",
      "Fragmented stack across 9+ vendors",
      ".env files leaked in Slack",
      "OAuth flows nobody understands",
      "Drift between staging and prod",
      "Deploys that take a meeting",
    ],
    capabilities_eyebrow: "What V can do",
    capabilities_title: "One operator. The whole stack.",
    capabilities_subtitle:
      "Speak naturally. V translates intent into a coordinated execution across your entire product surface — code, infra, services, secrets.",
    capabilities_items: [
      { title: "Frontend Generation", body: "Next.js + Tailwind UIs scaffolded from intent. Components, routing, design system inherited." },
      { title: "Backend Generation", body: "APIs, jobs, queues, auth, and persistence created in step with the frontend." },
      { title: "Deployments", body: "Vercel-native pipelines. Previews, production, rollbacks — one sentence away." },
      { title: "Integrations", body: "Stripe, Twilio, Clerk, Maps, AI Vision. Installed, configured, healthchecked." },
      { title: "Secrets Vault", body: "Encrypted credentials with per-project scopes, rotations and audit trails." },
      { title: "Domains", body: "Buy, link and certify domains conversationally with DNS guidance built-in." },
      { title: "Databases", body: "Provision and migrate Neon, Postgres, Redis. Schema diffs explained in plain language." },
      { title: "Automations", body: "Cron, webhooks, event-driven workflows orchestrated across services." },
      { title: "Modules Marketplace", body: "Install capability packs into any project. Composable, removable, auditable." },
    ],
    how_eyebrow: "How it works",
    how_title: "From sentence to shipped — in one continuous flow.",
    how_body:
      "VForge is not a chatbot. It’s an operator with privileges across your infrastructure, kept on rails by your approvals, guardrails and visual confirmations.",
    how_steps: [
      { title: "1. Describe the product", body: "Tell V what you want to build. No tickets, no specs — just intent." },
      { title: "2. V drafts the system", body: "Architecture, screens, services and integrations are proposed with previews." },
      { title: "3. You approve & connect", body: "Guided onboarding for GitHub, Vercel, Stripe, Twilio. Visual, friendly, secure." },
      { title: "4. VForge operates", body: "Deploys, rotations, scaling and incident response — all from one calm conversation." },
    ],
    workspace_eyebrow: "The Workspace",
    workspace_title: "A calm operating system for your product.",
    workspace_body:
      "The center of VForge is V. Left, your navigation across RepoVision, Deployments, Marketplace, Secrets and Domains. Right, a live operational panel showing the pulse of your product in real time.",
    workspace_bullets: [
      "· Cinematic dark, premium glassmorphism, violet/cyan accents.",
      "· Conversational primary surface — never overwhelmed by infrastructure.",
      "· Visual confirmations, never raw config files in your face.",
    ],
    workspace_cta: "Enter the workspace",
    cta_eyebrow: "Begin",
    cta_title: "Stop assembling tools. Operate a product.",
    cta_body:
      "Your stack, your domains, your secrets, your deploys — orchestrated by V in a single conversational workspace.",
    cta_primary: "Create your VForge",
    cta_secondary: "See pricing",
    footer_tagline:
      "VForge is an AI-native operational workspace. Build, deploy and orchestrate every service of your product through a single conversation with V.",
    footer_platform: "Platform",
    footer_company: "Company",
    footer_about: "About",
    footer_manifesto: "Manifesto",
    footer_security: "Security",
    footer_contact: "Contact",
    footer_legal: "© {year} VForge — Operate the future, conversationally.",
    footer_system: "Zenith Forge System · v0.1",
  },
  auth: {
    sign_in_title: "Welcome back to your forge.",
    sign_in_subtitle:
      "V is standing by. Resume conversations, audit recent deploys, rotate secrets — all from a single calm surface.",
    sign_up_title: "Forge a product through one conversation.",
    sign_up_subtitle:
      "We’ll guide you through connecting your ecosystem — GitHub, Vercel, payment rails, domains — with visual confirmations every step of the way.",
    sign_in_eyebrow: "Operator-grade workspace",
    sign_up_eyebrow: "Start with V",
    have_no_account: "Don’t have access? Sign up →",
    have_account: "Already have access? Sign in →",
    sso_github: "Continue with GitHub",
    sso_google: "Continue with Google",
    separator_or: "or",
    email_placeholder: "you@studio.com",
    password_placeholder: "••••••••",
    placeholder_disabled_note:
      "Authentication is powered by Clerk. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable the full flow.",
    enter_vforge: "Enter VForge",
  },
  onboarding: {
    step_progress: "Onboarding · step {current} / {total}",
    welcome_title: "Hello. I’m V.",
    welcome_body:
      "I’ll be your operator. Together we’ll connect a few services, then I’ll start building your first product. Take it at your pace — every action is yours to approve.",
    welcome_cta: "Let’s begin",
    profile_title: "Tell me about you",
    profile_body: "This shapes how I’ll talk to you, explain things, and what I’ll prioritize.",
    profile_name_label: "Your name",
    profile_name_placeholder: "e.g. Camila",
    profile_role_label: "Your role",
    profile_roles: ["Founder", "Engineer", "Designer", "Operator", "Hobbyist"],
    connect_title: "Connect your ecosystem",
    connect_body:
      "I’ll guide you through each one. You can skip any service and connect it later from the Marketplace.",
    label_recommended: "Recommended",
    label_connected: "Connected",
    project_title: "Your first project",
    project_body:
      "Give it a name and tell me what you want to build. I’ll draft the architecture for your approval inside the workspace.",
    project_name_label: "Project name",
    project_name_placeholder: "e.g. Orion Studio",
    project_intent_label: "What are we building?",
    project_intent_placeholder:
      "A small-studio SaaS with bookings, payments and SMS reminders. Premium dark UI. Maps for the studio location.",
    project_b_note:
      "I’ll propose the stack inside the workspace — frontend, backend, integrations and a deploy plan. You approve, I execute.",
    summary_title_named: "Welcome, {name}.",
    summary_title_anon: "Welcome aboard.",
    summary_body: "Your workspace is ready. I’ll start by drafting {project}.",
    summary_connected: "Connected",
    summary_ready: "ready",
    summary_later: "later",
    summary_project_fallback: "your project",
    enter_workspace: "Enter the workspace",
    integrations: {
      github: { name: "GitHub", blurb: "Host your code and let V push changes for you.", glossary: "GitHub stores your project’s code in repositories. VForge uses it to read, modify and create new repositories on your behalf — with your approval." },
      vercel: { name: "Vercel", blurb: "Deploy frontends, previews and edge functions instantly.", glossary: "Vercel turns your code into a live website. Every change creates a preview URL; production deploys go live with one approval from you." },
      domains: { name: "Domains", blurb: "Buy or connect a domain. V handles the DNS.", glossary: "A domain is the address users type to reach your product. VForge configures it automatically and issues SSL certificates for you." },
      neon: { name: "Database", blurb: "Spin up Postgres in seconds with branching previews.", glossary: "A database stores the real data of your product — users, payments, files. We use serverless Postgres with branching for safe migrations." },
      stripe: { name: "Stripe", blurb: "Charge customers, manage subscriptions, taxes and refunds.", glossary: "Stripe handles money — subscriptions, one-time payments, invoices. V configures products, prices and webhooks for you." },
      twilio: { name: "Twilio", blurb: "SMS, WhatsApp and voice notifications.", glossary: "Twilio sends messages to your users — confirmations, alerts, two-factor codes — across SMS, WhatsApp and voice." },
      maps: { name: "Maps", blurb: "Geocoding, places, routing for any location feature.", glossary: "Maps lets your product show locations, search addresses, and calculate routes. Useful for delivery, real estate or social apps." },
    },
    glossary_label: "Glossary",
  },
  glossary: {
    eyebrow: "Glossary",
    title: "The vocabulary of operating a product, in plain language.",
    body:
      "Every term you’ll encounter in VForge, explained without jargon. We surface these inline during onboarding so you’re never lost.",
    cta_primary: "Learn by doing — start free",
    cta_secondary: "Ask V anything",
    terms: [
      { title: "Repository (GitHub)", body: "A folder for your code. GitHub hosts repositories so multiple people (and V) can work on the same code without losing changes.", examples: ["V writes code into a branch.", "You approve the changes.", "V merges and triggers a deploy."] },
      { title: "Deployment (Vercel)", body: "Turning your code into a live website or API. Previews appear instantly for every change, production goes live with your approval.", examples: ["Preview URL: project-pr-12.vercel.app", "Production: forge.app"] },
      { title: "Domain", body: "The address users type to find your product. V configures DNS records and SSL certificates automatically.", examples: ["forge.app", "studio.forge.app"] },
      { title: "Secret", body: "A sensitive value (like an API key). Stored encrypted; only services that need it can read it.", examples: ["STRIPE_SECRET_KEY", "DATABASE_URL"] },
      { title: "Integration", body: "A pre-built connection to an external service like Stripe or Twilio. V installs, configures and monitors them.", examples: ["Stripe for payments", "Twilio for SMS"] },
      { title: "Database", body: "Where your product’s real data lives — users, orders, files. V handles schemas, migrations and backups.", examples: ["Postgres on Neon", "Redis for cache"] },
      { title: "API", body: "A doorway your frontend uses to ask your backend for things. V exposes APIs that match the features you describe.", examples: ["GET /api/bookings", "POST /api/stripe/checkout"] },
      { title: "Module", body: "A capability pack — like Auth, Payments, Maps. Modules can be installed or removed from a project at any time.", examples: ["Clerk Auth", "Stripe Payments", "Google Maps"] },
      { title: "Environment", body: "An isolated stage for your product. 'Development' is for you, 'preview' for branches, 'production' for real users.", examples: ["development", "preview", "production"] },
      { title: "Infrastructure", body: "The servers and services that make your product work. With VForge, you operate it conversationally instead of clicking 9 dashboards.", examples: ["Servers, queues, caches, CDN, jobs"] },
      { title: "Webhook", body: "A notification sent from one service to another when something happens. Stripe tells your app when a payment succeeded, for example.", examples: ["stripe.checkout.session.completed", "github.push"] },
      { title: "Subscription", body: "A recurring payment your users make to access your product. V sets up Stripe products and prices for you.", examples: ["Pro plan · $29/mo", "Studio plan · $99/mo"] },
    ],
  },
  pricing: {
    eyebrow: "Built like an OS, priced like a tool",
    title: "Operate one product or a portfolio.",
    body: "Every plan includes V, the conversational operator. Upgrade as your stack grows.",
    most_chosen: "Most chosen",
    talk_to_us_pre: "Need an enterprise tier? ",
    talk_to_us_link: "Talk to us",
    plans: [
      {
        name: "Solo",
        price: "$0",
        cadence: "/month",
        blurb: "For first sparks. Build with V, deploy with friends.",
        features: ["1 project", "V with daily quota", "GitHub + Vercel connection", "Community Marketplace", "Glossary onboarding"],
        cta: "Start free",
      },
      {
        name: "Studio",
        price: "$29",
        cadence: "/month",
        blurb: "For founders and small teams shipping real products.",
        features: ["Unlimited projects", "V with priority models", "Custom domains & SSL", "Secrets Vault with rotations", "Stripe, Twilio, Maps modules", "Email & in-app support"],
        cta: "Choose Studio",
      },
      {
        name: "Forge",
        price: "$99",
        cadence: "/month",
        blurb: "For operators running multiple products at scale.",
        features: ["Team seats & roles", "Audit trails & approvals", "Private modules", "Multi-region deploys", "Org-wide secrets policies", "Dedicated success engineer"],
        cta: "Choose Forge",
      },
    ],
  },
  marketplace: {
    eyebrow: "Marketplace",
    title_public: "Capabilities, ready to compose.",
    body_public:
      "Every module is configured and operated by V. Auth, payments, messaging, AI, storage — install conversationally and remove anytime.",
    title_workspace: "Install capabilities. Compose your product.",
    body_workspace:
      "Modular building blocks for auth, payments, maps, AI, messaging and more. V installs and configures them for you.",
    search_placeholder: "Search modules…",
    ask_b_title: "Ask V",
    ask_b_body:
      '"I need payments." "I need authentication." "I need maps." — V picks and installs the right module for your project, configures it, and exposes the APIs you need.',
    categories: ["All", "Auth", "Payments", "Messaging", "Maps", "Database", "AI", "Email", "Files", "Deploy", "DNS", "Security"],
    modules: {
      clerk: { name: "Clerk", category: "Auth", blurb: "Drop-in authentication with SSO, MFA and orgs." },
      stripe: { name: "Stripe", category: "Payments", blurb: "Subscriptions, one-time, taxes and invoices." },
      twilio: { name: "Twilio", category: "Messaging", blurb: "SMS, WhatsApp and voice notifications." },
      maps: { name: "Google Maps", category: "Maps", blurb: "Geocoding, places and routes." },
      neon: { name: "Neon Postgres", category: "Database", blurb: "Serverless Postgres with branching." },
      vision: { name: "AI Vision", category: "AI", blurb: "Image understanding for moderation, OCR, captioning." },
      mail: { name: "Resend", category: "Email", blurb: "Transactional email with deliverability built-in." },
      storage: { name: "Storage", category: "Files", blurb: "Object storage with signed URLs and CDN." },
      vercel: { name: "Vercel", category: "Deploy", blurb: "Edge deploys, previews and analytics." },
      domains: { name: "Domains", category: "DNS", blurb: "Register, link and certify domains." },
      agent: { name: "Operator Bots", category: "AI", blurb: "Custom V-personalities for specific workflows." },
      audit: { name: "Audit Vault", category: "Security", blurb: "Tamper-evident logs and SOC2 reports." },
    },
  },
  workspace: {
    nav: {
      chat: "Chat with V",
      repovision: "RepoVision",
      deployments: "Deployments",
      marketplace: "Marketplace",
      integrations: "Integrations",
      secrets: "Secrets Vault",
      projects: "Projects",
      activity: "Activity",
      hub: "Hub",
      settings: "Settings",
      help: "Help",
    },
    quick_command: "Quick command",
    workspace_label: "Workspace",
    b_ready: "V · ready",
    b_insights_label: "V insights",
    b_insights_body: "forge.app latency dropped 12% after the last deploy.",
    breadcrumb_app: "app",
    mobile_labels: { b: "V", deploy: "Deploy", projects: "Projects", vault: "Vault", alerts: "Alerts" },
  },
  chat: {
    intro:
      "Hi — I’m V. Tell me what you want to build, or ask me to operate something. I can scaffold projects, configure integrations, deploy and run audits.",
    operator_label: "Operator · ready · forge.app",
    placeholder: "Ask V to build, deploy, connect or operate anything…",
    shift_enter_hint: "Shift + Enter for newline",
    send: "Send",
    thinking: "V is thinking…",
    quick_prompts: [
      "Create a SaaS for bookings",
      "Add Stripe to ‘Orion Studio’",
      "Rotate all secrets in production",
      "Connect domain forge.app",
    ],
    b_response_text:
      "On it. Drafting a plan and queueing the actions. You’ll be asked to approve anything that touches production.",
    b_response_actions: [
      "Create Next.js frontend",
      "Generate REST API + Postgres schema",
      "Configure Stripe checkout",
      "Deploy preview to Vercel",
    ],
    ops: {
      title: "Live operations",
      build: "Build",
      errors: "Errors",
      deploys: "Deploys",
      modules: "Modules",
      recent: "Recent events",
      events: [
        "repo · auth-service updated",
        "db · neon-prod migrated",
        "domain · forge.app linked",
        "deploy · pr-12 preview ready",
      ],
      suggest_label: "V suggests",
      suggest_body: "Add automated nightly Postgres backups to orion-prod?",
    },
  },
  repovision: {
    eyebrow: "RepoVision",
    title: "Every repository, every environment, one view.",
    body: "Visual oversight of the code that powers your products. V writes; you stay in control.",
    cta_connect: "Connect repo",
    cta_refactor: "Ask V to refactor",
    open_prs: "{count} open PRs",
    open: "Open",
    last_deploy: "deploy · {time}",
    recent_commits: "Recent commits",
  },
  deployments: {
    eyebrow: "Deployments",
    title: "Every release, every preview, narrated.",
    body: "Conversational deploys with V. Approve production, watch builds, roll back instantly.",
    open_vercel: "Open Vercel",
    promote: "Promote preview",
    stats: { healthy: "Healthy", avg_build: "Avg build", released_today: "Released today", failed_7d: "Failed (7d)" },
    table: { deploy: "Deploy", project: "Project", env: "Env", commit: "Commit", build: "Build", status: "Status", when: "When" },
  },
  integrations: {
    eyebrow: "Integrations",
    title: "The connective tissue of your stack.",
    body: "Live status, scopes, webhooks and rotations across every connected service. V repairs what it can, asks for the rest.",
    cta_connect_new: "Connect new",
    manage: "Manage →",
  },
  secrets: {
    eyebrow: "Secrets Vault",
    title: "Encrypted credentials, conversational rotations.",
    body: "Every value sealed at rest and in transit. V rotates, audits and warns you before any value expires.",
    rotate_all: "Rotate all",
    add: "Add secret",
    stats: { encrypted: "Encrypted at rest", rotations: "Rotations (30d)", audit: "Audit events", stale: "Stale (> 90d)" },
    sealed: "sealed",
    list_label: "Secrets",
  },
  projects: {
    eyebrow: "Projects",
    title: "Every product you operate, at a glance.",
    body: "Spawn new products conversationally with V, or manage what’s already shipped.",
    cta_import: "Import existing",
    cta_new: "Forge new",
    stats: { modules: "Modules", team: "Team", last_deploy: "Last deploy", repo: "Repos" },
    ask_b: "Ask V about {name} →",
    open: "Open",
  },
  activity: {
    eyebrow: "Activity",
    title: "The narrated history of your product.",
    body:
      "A single, chronological feed of everything V does, what changes, and what needs your attention.",
    export: "Export · CSV",
  },
  hub: {
    eyebrow: "Hub",
    title: "A calm place for ideas, knowledge and community.",
    body: "Templates from other operators, learning paths, and the latest from V.",
    featured: "Featured",
    manifesto_title: '"Operate, don’t orchestrate."',
    manifesto_body:
      "A short manifesto on why infrastructure should disappear, and why your product deserves a single calm surface.",
    read_essay: "Read the essay",
    learning: "Learning paths",
    learning_items: ["Build your first SaaS in 20 minutes", "Connect a domain with DNSSEC", "Modeling subscriptions with Stripe"],
    templates: "Templates",
    templates_body: "Studio booking · Marketplace · Internal tool · Mobile-first PWA.",
    browse_all: "Browse all",
    community: "Community",
    community_body: "Builders sharing operator recipes, modules and post-mortems.",
    open_discord: "Open Discord",
    tips: "V tips this week",
    tips_items: ["· Use 'preview' for risky migrations.", "· Ask V for a security audit monthly.", "· Rotate API keys with one sentence."],
    forge_news_title: "Latest from the Forge",
    forge_news_body:
      "New: Operator Bots, Audit Vault, AI Vision module · We’re hiring · A new keynote drop.",
    summarize: "Tell V to summarize",
    support: "Support",
    support_body: "Open a thread with a real engineer. Most replies under 4h.",
    contact: "Contact support",
  },
  settings: {
    eyebrow: "Settings",
    title: "Tune VForge to your style.",
    body: "Everything that shapes how V works for you.",
    sections: [
      { title: "Profile", body: "Your name, role, time zone and avatar." },
      { title: "Appearance", body: "Cinematic dark and premium day mode with toggle. Accent intensity controls." },
      { title: "Notifications", body: "Where to ping you when V needs approval." },
      { title: "Security", body: "MFA, devices, SSO and session policies." },
      { title: "Tokens", body: "Personal tokens for CLI and CI/CD access." },
      { title: "Billing", body: "Plan, invoices and seats." },
    ],
    open: "Open",
  },
  not_found: {
    code: "404 · drift",
    title: "Nothing to operate here.",
    body: "That route doesn’t exist — yet. Ask V and we’ll forge it.",
    back: "Back to landing",
    open_workspace: "Open the workspace",
  },
  offline: {
    title: "You’re offline.",
    body:
      "V is still here — the workspace shell is cached. We’ll resume live operations as soon as you’re back online.",
    open_shell: "Open offline shell",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { es, en };
