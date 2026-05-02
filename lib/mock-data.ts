export interface Project {
  id: string;
  name: string;
  slug: string;
  repo: string;
  domain: string | null;
  stack: string;
  status: "live" | "building" | "error" | "idle";
  lastDeploy: string | null;
  favicon: {
    gradient: string;
    initials: string;
    color: string;
  };
  description: string;
  secrets: number;
  deploysToday: number;
}

export interface VaultSecret {
  name: string;
  project: string | null;
  lastUsed: string | null;
  scope: "client" | "platform" | "platform-global";
  injectedTo: string[];
}

export interface Module {
  id: string;
  name: string;
  description: string;
  state: "installed" | "available" | "beta";
  tags: string[];
  icon: string;
}

export interface ActivityItem {
  id: number;
  time: string;
  actor: string;
  verb: string;
  target: string;
  kind: "deploy" | "vault" | "error" | "vision" | "warning" | "create" | "scout" | "settings" | "backup" | "refactor";
  project: string | null;
}

export interface RecentVision {
  repo: string;
  score: string;
  duration: string;
  time: string;
}

export interface RecentHunter {
  query: string;
  results: number;
  time: string;
}

export interface RecentScout {
  question: string;
  answer: string;
  time: string;
}

export const PROJECTS: Project[] = [
  {
    id: "castores",
    name: "Castores Control",
    slug: "castores",
    repo: "turbillon50/FINAL-CASTORES",
    domain: "castores.info",
    stack: "Next 14",
    status: "live",
    lastDeploy: "3h",
    favicon: { gradient: "from-green-900 to-black", initials: "CC", color: "#7CFF3C" },
    description: "Construction management web app",
    secrets: 8,
    deploysToday: 3,
  },
  {
    id: "vandefi",
    name: "VanDeFi",
    slug: "vandefi",
    repo: "turbillon50/vandefi",
    domain: "vandefi.bandefi.org",
    stack: "Next 14",
    status: "building",
    lastDeploy: "1h",
    favicon: { gradient: "from-blue-900 to-black", initials: "VD", color: "#6699FF" },
    description: "Non-custodial DeFi neobank",
    secrets: 12,
    deploysToday: 2,
  },
  {
    id: "urmah",
    name: "URMAH",
    slug: "urmah",
    repo: "turbillon50/urmah",
    domain: "urmah.live",
    stack: "PWA",
    status: "live",
    lastDeploy: "2d",
    favicon: { gradient: "from-red-900 to-black", initials: "UR", color: "#FF8866" },
    description: "Cinematic ticketing PWA",
    secrets: 6,
    deploysToday: 0,
  },
  {
    id: "movee",
    name: "Movee",
    slug: "movee",
    repo: "turbillon50/movee",
    domain: "movee.mx",
    stack: "React",
    status: "live",
    lastDeploy: "5d",
    favicon: { gradient: "from-cyan-900 to-black", initials: "MV", color: "#66DDDD" },
    description: "Ride-sharing for Mexico",
    secrets: 5,
    deploysToday: 1,
  },
  {
    id: "rivones",
    name: "Rivones / Autospot",
    slug: "rivones",
    repo: "turbillon50/rivones",
    domain: "autospot.mx",
    stack: "Vite",
    status: "error",
    lastDeploy: "1d",
    favicon: { gradient: "from-orange-900 to-black", initials: "RV", color: "#FFAA66" },
    description: "Car rental marketplace · build failed",
    secrets: 4,
    deploysToday: 0,
  },
  {
    id: "jobber",
    name: "Jobber Logística",
    slug: "jobber",
    repo: "turbillon50/jobber-",
    domain: "jobber.allglobal.ec",
    stack: "Next 14",
    status: "live",
    lastDeploy: "6h",
    favicon: { gradient: "from-purple-900 to-black", initials: "JL", color: "#BB99FF" },
    description: "Parcel logistics PWA",
    secrets: 7,
    deploysToday: 1,
  },
  {
    id: "sure",
    name: "Sure & Sure",
    slug: "sure",
    repo: "turbillon50/sure-and-sure",
    domain: null,
    stack: "Planning",
    status: "idle",
    lastDeploy: null,
    favicon: { gradient: "from-blue-900 to-slate-900", initials: "SS", color: "#88BBFF" },
    description: "Life insurance premium financing fund",
    secrets: 0,
    deploysToday: 0,
  },
  {
    id: "vmomentum",
    name: "V-Momentum HQ",
    slug: "vmomentum",
    repo: "turbillon50/v-momentum",
    domain: "momentum.allglobal.ec",
    stack: "Next 14",
    status: "live",
    lastDeploy: "12h",
    favicon: { gradient: "from-pink-900 to-black", initials: "VM", color: "#FF99DD" },
    description: "App factory for client projects",
    secrets: 5,
    deploysToday: 7,
  },
];

export const VAULT_SECRETS: VaultSecret[] = [
  { name: "STRIPE_SECRET_KEY", project: "castores", lastUsed: "2h", scope: "client", injectedTo: ["vercel", "railway"] },
  { name: "DATABASE_URL", project: "castores", lastUsed: "1m", scope: "platform", injectedTo: ["vercel"] },
  { name: "CLERK_SECRET_KEY", project: "castores", lastUsed: "3h", scope: "platform", injectedTo: ["vercel"] },
  { name: "RESEND_API_KEY", project: "castores", lastUsed: null, scope: "platform", injectedTo: [] },
  { name: "VERCEL_TOKEN", project: null, lastUsed: "1m", scope: "platform-global", injectedTo: [] },
  { name: "ANTHROPIC_API_KEY", project: null, lastUsed: "30s", scope: "platform-global", injectedTo: [] },
  { name: "GITHUB_TOKEN", project: null, lastUsed: "5m", scope: "platform-global", injectedTo: [] },
  { name: "CLOUDFLARE_API_TOKEN", project: null, lastUsed: "1h", scope: "platform-global", injectedTo: [] },
];

export const MODULES: Module[] = [
  { id: "repo-vision", name: "Repo Vision", description: "Diagrama + mockup visual de cualquier repositorio en 2 min.", state: "installed", tags: ["CLAUDE", "MERMAID"], icon: "Eye" },
  { id: "repo-hunter", name: "Repo Hunter", description: "Búsqueda semántica de repositorios en GitHub, NPM y awesome lists.", state: "installed", tags: ["GITHUB", "NPM"], icon: "Search" },
  { id: "stack-scout", name: "Stack Scout", description: "Recomendaciones técnicas: qué proveedor usar y cómo conectarlo.", state: "installed", tags: ["RESEARCH"], icon: "Compass" },
  { id: "health-monitor", name: "Health Monitor", description: "Vigilancia 24/7 de uptime, deploys y errores en producción.", state: "installed", tags: ["SENTRY", "UPTIME"], icon: "Activity" },
  { id: "contracts", name: "Contracts", description: "NDA, prestación, asociación · firma digital · plantillas MIRMAR.", state: "available", tags: ["DOCX", "PDF", "SIGN"], icon: "FileText" },
  { id: "billing-sat", name: "Billing SAT 4.0", description: "Facturación electrónica MX automática vía Facturapi.", state: "available", tags: ["SAT", "FACTURAPI"], icon: "DollarSign" },
  { id: "whatsapp-bot", name: "WhatsApp Bot", description: "Comunicación con clientes vía Twilio · plantillas + auto-reply.", state: "available", tags: ["TWILIO"], icon: "MessageSquare" },
  { id: "analytics-cross", name: "Analytics Cross", description: "Métricas cruzadas de Stripe, MercadoPago, Ticket Tailor.", state: "beta", tags: ["STRIPE", "MP"], icon: "BarChart" },
  { id: "backups-vault", name: "Backups Vault", description: "Backups nocturnos cifrados a Cloudflare R2 · retención 30+12.", state: "available", tags: ["R2", "AES256"], icon: "Database" },
  { id: "client-portal", name: "Client Portal", description: "Portal externo para que clientes vean sus proyectos en vivo.", state: "available", tags: ["AUTH", "CLERK"], icon: "Users" },
  { id: "legal-monitor", name: "Legal Monitor", description: "Monitoreo semanal de menciones públicas con alertas.", state: "available", tags: ["WEB", "ALERTS"], icon: "Shield" },
  { id: "tax-tracker", name: "Tax Tracker", description: "Tracker fiscal MIRMAR con OCR de tickets y conciliación bancaria.", state: "beta", tags: ["OCR", "SAT"], icon: "Calculator" },
];

export const ACTIVITY: ActivityItem[] = [
  { id: 1, time: "3 min", actor: "Forge", verb: "desplegó", target: "castores.info → producción", kind: "deploy", project: "castores" },
  { id: 2, time: "12 min", actor: "Luis", verb: "agregó secreto", target: "STRIPE_SECRET_KEY a Castores", kind: "vault", project: "castores" },
  { id: 3, time: "34 min", actor: "Forge", verb: "falló build en", target: "rivones / autospot.mx", kind: "error", project: "rivones" },
  { id: 4, time: "1 h", actor: "Forge", verb: "escaneó repo", target: "vandefi (score 9/10)", kind: "vision", project: "vandefi" },
  { id: 5, time: "2 h", actor: "Health Monitor", verb: "alertó latencia alta en", target: "jobber.allglobal.ec", kind: "warning", project: "jobber" },
  { id: 6, time: "3 h", actor: "Luis", verb: "creó proyecto", target: "Sure & Sure", kind: "create", project: "sure" },
  { id: 7, time: "5 h", actor: "Forge", verb: "propuso stack para", target: "V-Momentum HQ", kind: "scout", project: "vmomentum" },
  { id: 8, time: "6 h", actor: "Forge", verb: "desplegó", target: "jobber.allglobal.ec → producción", kind: "deploy", project: "jobber" },
  { id: 9, time: "8 h", actor: "Luis", verb: "actualizó dominio de", target: "Movee", kind: "settings", project: "movee" },
  { id: 10, time: "12 h", actor: "Forge", verb: "desplegó", target: "momentum.allglobal.ec", kind: "deploy", project: "vmomentum" },
  { id: 11, time: "1 d", actor: "Backups Vault", verb: "completó snapshot de", target: "8 proyectos a R2", kind: "backup", project: null },
  { id: 12, time: "2 d", actor: "Forge", verb: "refactorizó schema en", target: "URMAH", kind: "refactor", project: "urmah" },
];

export const RECENT_VISION: RecentVision[] = [
  { repo: "turbillon50/vandefi", score: "9/10", duration: "1m 47s", time: "1 h" },
  { repo: "shadcn/ui", score: "10/10", duration: "2m 03s", time: "yesterday" },
  { repo: "vercel/next.js", score: "10/10", duration: "4m 12s", time: "3 d" },
];

export const RECENT_HUNTER: RecentHunter[] = [
  { query: "PWA ticketing offline-first", results: 14, time: "30 min" },
  { query: "DeFi self-custody wallet React", results: 22, time: "4 h" },
  { query: "OCR receipt extraction node", results: 9, time: "2 d" },
];

export const RECENT_SCOUT: RecentScout[] = [
  { question: "¿Qué proveedor para video chat WebRTC con grabación?", answer: "LiveKit Cloud", time: "1 h" },
  { question: "¿Cómo cobrar SPEI con conciliación automática?", answer: "Conekta vs MercadoPago", time: "1 d" },
  { question: "¿Mejor stack para PWA cinematográfica iOS-grade?", answer: "Next 14 + Capacitor + Framer", time: "3 d" },
];

// Stats for Hub
export const HUB_STATS = {
  activeProjects: { value: 8, delta: "+1 esta semana", tone: "positive" as const },
  deploysToday: { value: 14, delta: "12 ok · 2 fallidos", tone: "warning" as const },
  forgeRuns: { value: 47, delta: "avg 1.4 min", tone: "neutral" as const },
  uptime: { value: "99.84%", delta: "últimos 30 días", tone: "positive" as const },
};
