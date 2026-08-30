import { parseReviewAnchor, type ReviewAnchor } from "./review-context";
import { roomToolsBrief } from "./project-tools";

export interface RoomComment {
  id?: string;
  author_email?: string | null;
  author_name?: string | null;
  body: string;
  created_at?: string | null;
  anchor?: unknown;
}

export interface RoomReference {
  label: string;
  url: string;
  kind?: string | null;
  notes?: string | null;
}

export interface RoomProjectInfo {
  name?: string | null;
  description?: string | null;
  domain?: string | null;
  vercel_url?: string | null;
  github_url?: string | null;
  status?: string | null;
}

export interface RoomPage {
  url: string;
  title?: string | null;
  text: string;
}

export interface RoomRepository {
  repo_full_name: string;
  role?: string | null;
  is_primary?: boolean;
}

export interface RoomEye {
  source: string;
  viewport?: string | null;
  url?: string | null;
  note?: string | null;
  created_at?: string | null;
}

export interface RoomContextInput {
  projectId: string;
  project?: RoomProjectInfo | null;
  comments?: RoomComment[];
  references?: RoomReference[];
  document?: string | null;
  assets?: Array<{ filename: string }>;
  repositories?: RoomRepository[];
  decisions?: string | null;
  pages?: RoomPage[];
  archives?: Array<{ filename: string; text: string }>;
  eyes?: RoomEye[];
}

export function isSystemComment(comment: RoomComment): boolean {
  const name = (comment.author_name || "").toLowerCase();
  const body = comment.body.trim();
  return (
    name.includes("sistema") ||
    body.startsWith("✓ Tarea") ||
    body.startsWith("Resuelto sin tarea") ||
    body.startsWith("Tarea ")
  );
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function urlKey(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function formatAnchor(raw: unknown): string {
  const anchor: ReviewAnchor | null = parseReviewAnchor(raw);
  if (!anchor) return "";
  const pct = `${Math.round(anchor.x * 100)}%, ${Math.round(anchor.y * 100)}%`;
  const selector = anchor.selector ? ` · ${anchor.selector}` : "";
  return ` [${anchor.viewport} · ${anchor.label} · ${pct} · ${anchor.url}${selector}]`;
}

export function formatRoomContext(input: RoomContextInput): string {
  const lines: string[] = [
    "CONTEXTO DE LA SALA. Léelo completo. Cuando el usuario dice «puntos», «observaciones», «lo que marqué» o «lo de ahí», se refiere a esto.",
    "No afirmes que no lo ves. No pidas que te lo reescriba si ya está aquí.",
    "Lee comentarios, URLs de referencia y el HTML extraído. Si una URL no trajo HTML, dílo; no inventes la página.",
  ];

  const project = input.project ?? {};
  const title = project.name?.trim() || input.projectId;
  lines.push(`PROYECTO: ${title} (${input.projectId})`);
  if (project.status) lines.push(`ESTADO: ${project.status}`);
  if (project.description?.trim()) {
    lines.push(`DESCRIPCIÓN: ${clip(project.description, 400)}`);
  }
  const urls = [
    project.domain ? `dominio ${project.domain}` : null,
    project.vercel_url ? `preview ${project.vercel_url}` : null,
    project.github_url ? `github ${project.github_url}` : null,
  ].filter(Boolean);
  if (urls.length) lines.push(`URLS DEL PROYECTO: ${urls.join(" · ")}`);
  lines.push(roomToolsBrief());

  const repositories = (input.repositories ?? [])
    .filter((repo) => repo.repo_full_name?.trim())
    .slice(0, 12);
  if (repositories.length) {
    lines.push("GRUPO MULTIRREPOSITORIO:");
    for (const repo of repositories) {
      const role = repo.role?.trim() || "app";
      const primary = repo.is_primary ? " · principal" : "";
      lines.push(`- [${role}] ${repo.repo_full_name}${primary}`);
    }
  }

  if (input.decisions?.trim()) {
    lines.push("");
    lines.push(input.decisions.trim());
  }

  const observations = (input.comments ?? [])
    .filter((comment) => comment.body?.trim() && !isSystemComment(comment))
    .slice(0, 50);
  lines.push("");
  if (observations.length === 0) {
    lines.push("OBSERVACIONES: ninguna todavía.");
  } else {
    lines.push(
      `OBSERVACIONES / PUNTOS MARCADOS (${observations.length}, vitales):`,
    );
    observations.forEach((comment, index) => {
      const author =
        comment.author_name?.trim() ||
        comment.author_email?.trim() ||
        "alguien de la sala";
      const when = comment.created_at
        ? ` · ${comment.created_at.slice(0, 16).replace("T", " ")}`
        : "";
      lines.push(
        `${index + 1}. ${author}${when}${formatAnchor(comment.anchor)}`,
      );
      lines.push(`   ${clip(comment.body, 800)}`);
    });
  }

  const references = (input.references ?? [])
    .filter((item) => item.url?.trim())
    .slice(0, 30);
  const readKeys = new Set(
    (input.pages ?? []).map((page) => urlKey(page.url)),
  );
  const visualKinds = new Set(["inspiration", "component", "marca", "brand", "visual"]);
  const visualRefs = references.filter((item) =>
    visualKinds.has((item.kind || "").toLowerCase()),
  );
  const pageRefs = references.filter(
    (item) => !visualKinds.has((item.kind || "").toLowerCase()),
  );

  const formatRef = (item: RoomReference): string => {
    const kind = item.kind?.trim() ? `[${item.kind}] ` : "";
    const label = item.label?.trim() || item.url;
    const notes = item.notes?.trim() ? ` — ${clip(item.notes, 180)}` : "";
    const read = readKeys.has(urlKey(item.url)) ? " · HTML leído" : " · sin HTML leído aún";
    return `- ${kind}${label}: ${item.url}${notes}${read}`;
  };

  lines.push("");
  if (visualRefs.length === 0) {
    lines.push("MARCAS Y REFERENCIAS VISUALES: ninguna todavía.");
  } else {
    lines.push(
      `MARCAS Y REFERENCIAS VISUALES (${visualRefs.length}). Están en la sala. No digas que no las ves.`,
    );
    for (const item of visualRefs) lines.push(formatRef(item));
  }
  lines.push("");
  if (pageRefs.length === 0 && visualRefs.length === 0) {
    lines.push("REFERENCIAS DE PÁGINA: ninguna todavía.");
  } else if (pageRefs.length) {
    lines.push(`URLS DE REFERENCIA (${pageRefs.length}):`);
    for (const item of pageRefs) lines.push(formatRef(item));
  }

  const pages = (input.pages ?? []).filter((page) => page.text?.trim()).slice(0, 10);
  if (pages.length) {
    lines.push("");
    lines.push(`CONTENIDO LEÍDO DE LAS URLS (${pages.length}):`);
    for (const page of pages) {
      const title = page.title?.trim() ? ` — ${page.title.trim()}` : "";
      lines.push(`### ${page.url}${title}`);
      lines.push(clip(page.text, 2200));
    }
  }

  const archives = (input.archives ?? []).filter((item) => item.text?.trim()).slice(0, 3);
  if (archives.length) {
    lines.push("");
    lines.push(`CONVERSACIONES CARGADAS (${archives.length}):`);
    for (const archive of archives) {
      lines.push(`### ${archive.filename.trim() || "chat.zip"}`);
      lines.push(clip(archive.text, 3500));
    }
  }

  const document = input.document?.trim();
  lines.push("");
  if (document) {
    lines.push("CONTENIDO.md DE LA SALA:");
    lines.push(clip(document, 5000));
  } else {
    lines.push("CONTENIDO.md: vacío.");
  }

  const assets = (input.assets ?? [])
    .map((asset) => asset.filename?.trim())
    .filter(Boolean)
    .slice(0, 20);
  const imageAssets = assets.filter((name) =>
    /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(name),
  );
  const otherAssets = assets.filter((name) => !imageAssets.includes(name));
  if (imageAssets.length) {
    lines.push("");
    lines.push(
      `ARCHIVOS VISUALES EN CONTEXTO (${imageAssets.length}): ${imageAssets.join(", ")}`,
    );
  }
  if (otherAssets.length) {
    lines.push("");
    lines.push(`ARCHIVOS EN CONTEXTO: ${otherAssets.join(", ")}`);
  }

  const eyes = (input.eyes ?? []).slice(0, 12);
  lines.push("");
  if (eyes.length === 0) {
    lines.push(
      "OJOS DE LA SALA: sin fotos todavía. Pide fotografiar visores o usa el plugin.",
    );
  } else {
    lines.push(
      `OJOS DE LA SALA (${eyes.length}). Fotos reales de visores y plugin. No digas que la sala no tiene marca.`,
    );
    for (const eye of eyes) {
      const when = eye.created_at
        ? ` · ${eye.created_at.slice(0, 16).replace("T", " ")}`
        : "";
      const view = eye.viewport?.trim() || eye.source;
      const note = eye.note?.trim() ? ` — ${clip(eye.note, 120)}` : "";
      const url = eye.url?.trim() ? ` · ${eye.url}` : "";
      lines.push(`- [${eye.source}] ${view}${when}${url}${note}`);
    }
  }

  let text = lines.join("\n");
  if (text.length > 22000) text = `${text.slice(0, 21999)}…`;
  return text;
}

export function formatBrainBrief(input: {
  files: Array<{ title: string; content: string }>;
  lessons: Array<{ title: string; content: string }>;
}): string {
  const lines = [
    "EXPERIENCIA V / BRAIN. Esto no es la sala: es la memoria de la fábrica.",
    "Úsalo. No pidas que te lo reescriban. No inventes proyectos que no estén aquí.",
    "Doctrina: toda app tiene MCP. Código lo hace Claude Code en Hetzner. Grok investiga. Codex cubre si Claude no puede. Nunca n8n.",
  ];
  if (input.files.length) {
    lines.push(`MEMORIA (${input.files.length}):`);
    for (const file of input.files.slice(0, 6)) {
      lines.push(`- ${clip(file.title, 80)}: ${clip(file.content, 280)}`);
    }
  }
  if (input.lessons.length) {
    lines.push(`LECCIONES (${input.lessons.length}):`);
    for (const lesson of input.lessons.slice(0, 5)) {
      lines.push(`- ${clip(lesson.title, 80)}: ${clip(lesson.content, 220)}`);
    }
  }
  if (!input.files.length && !input.lessons.length) {
    lines.push("Sin fichas del Brain para este proyecto todavía.");
  }
  let text = lines.join("\n");
  if (text.length > 2200) text = `${text.slice(0, 2199)}…`;
  return text;
}
