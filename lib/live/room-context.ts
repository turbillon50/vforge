import { parseReviewAnchor, type ReviewAnchor } from "./review-context";

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
    .slice(0, 30);
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
      lines.push(`   ${clip(comment.body, 500)}`);
    });
  }

  const references = (input.references ?? [])
    .filter((item) => item.url?.trim())
    .slice(0, 20);
  lines.push("");
  if (references.length === 0) {
    lines.push("REFERENCIAS: ninguna todavía.");
  } else {
    lines.push(`URLS DE REFERENCIA (${references.length}):`);
    for (const item of references) {
      const kind = item.kind?.trim() ? `[${item.kind}] ` : "";
      const label = item.label?.trim() || item.url;
      const notes = item.notes?.trim() ? ` — ${clip(item.notes, 180)}` : "";
      lines.push(`- ${kind}${label}: ${item.url}${notes}`);
    }
  }

  const pages = (input.pages ?? []).filter((page) => page.text?.trim()).slice(0, 5);
  if (pages.length) {
    lines.push("");
    lines.push(`CONTENIDO LEÍDO DE LAS URLS (${pages.length}):`);
    for (const page of pages) {
      const title = page.title?.trim() ? ` — ${page.title.trim()}` : "";
      lines.push(`### ${page.url}${title}`);
      lines.push(clip(page.text, 1600));
    }
  }

  const document = input.document?.trim();
  lines.push("");
  if (document) {
    lines.push("CONTENIDO.md DE LA SALA:");
    lines.push(clip(document, 4000));
  } else {
    lines.push("CONTENIDO.md: vacío.");
  }

  const assets = (input.assets ?? [])
    .map((asset) => asset.filename?.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (assets.length) {
    lines.push("");
    lines.push(`ARCHIVOS EN CONTEXTO: ${assets.join(", ")}`);
  }

  let text = lines.join("\n");
  if (text.length > 14000) text = `${text.slice(0, 13999)}…`;
  return text;
}
