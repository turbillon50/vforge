/**
 * API Invitaciones — owner invita participantes a un proyecto.
 *
 * POST  — (solo owner) invita un contacto a un proyecto con un scope.
 *         Body { project_id, contact, method?, scope?, email?, phone?, role? }.
 *           - method: 'email' (default) | 'whatsapp'.
 *           - contact: el correo (method=email) o el teléfono (method=whatsapp).
 *             También se aceptan los campos legacy `email` / `phone`.
 *           - scope: 'cliente' | 'colaborador' | 'admin' | 'invitado'
 *             → se mapea al rol RBAC (viewer/editor/owner). `role` legacy sigue
 *             funcionando.
 *         Para WhatsApp (sin email) se sintetiza una clave estable
 *         `wa-<digits>@whatsapp.invite` que respeta el NOT NULL + UNIQUE de la
 *         tabla y permite recuperar el teléfono al leer.
 *         Inserta en project_members (status='invited'). Si ya existe
 *         (project_id + clave): actualiza el rol. Devuelve la invitación
 *         enriquecida con { method, contact, scope }.
 * GET   — (solo owner) ?project_id=X → lista los miembros del proyecto,
 *         cada uno enriquecido con { method, contact, scope }.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryAll, queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string | null;
  clerk_user_id: string | null;
  email: string;
  role: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: string;
  phone?: string | null;
  method?: string | null;
  scope?: string | null;
};

const VALID_ROLES = ["owner", "admin", "editor", "viewer", "client", "guest"];

// Scope de acceso (cara visible) → rol RBAC (lo que guarda la tabla).
const SCOPE_TO_ROLE: Record<string, string> = {
  admin: "owner",
  colaborador: "editor",
  cliente: "viewer",
  invitado: "viewer",
};

// Rol RBAC → scope mostrado al leer (no hay columna scope en la tabla).
const ROLE_TO_SCOPE: Record<string, string> = {
  owner: "admin",
  editor: "colaborador",
  viewer: "cliente",
};

const WHATSAPP_DOMAIN = "@whatsapp.invite";

/** ¿El email almacenado es en realidad una clave sintética de WhatsApp? */
function isWhatsappKey(email: string): boolean {
  return email.startsWith("wa-") && email.endsWith(WHATSAPP_DOMAIN);
}

/** Devuelve los campos de presentación derivados de un registro. */
function describeMember(m: ProjectMember) {
  if (isWhatsappKey(m.email)) {
    const digits = m.email.slice(3, m.email.length - WHATSAPP_DOMAIN.length);
    return { method: "whatsapp" as const, contact: `+${digits}` };
  }
  return { method: "email" as const, contact: m.email };
}

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function GET(req: NextRequest) {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const projectId = req.nextUrl.searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json(
        { error: "project_id requerido" },
        { status: 400 },
      );
    }

    const rows = await queryAll<ProjectMember>(
      `SELECT * FROM project_members
       WHERE project_id = $1
       ORDER BY invited_at DESC`,
      [projectId],
    );

    const members = rows.map((m) => ({
      ...m,
      ...describeMember(m),
      scope: ROLE_TO_SCOPE[m.role] ?? "cliente",
    }));

    return NextResponse.json({ members });
  } catch (err) {
    console.error("[invitations] GET error:", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los miembros" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { project_id, contact, method, scope, email, phone, role } =
      body as Record<string, unknown>;

    if (typeof project_id !== "string" || !project_id.trim()) {
      return NextResponse.json(
        { error: "project_id requerido" },
        { status: 400 },
      );
    }

    const cleanMethod = method === "whatsapp" ? "whatsapp" : "email";

    // Rol: scope tiene prioridad, luego role legacy, default viewer.
    let cleanRole = "viewer";
    if (typeof scope === "string" && SCOPE_TO_ROLE[scope]) {
      cleanRole = SCOPE_TO_ROLE[scope];
    } else if (typeof role === "string" && VALID_ROLES.includes(role)) {
      cleanRole = role;
    }

    // Clave de almacenamiento (columna email, NOT NULL + UNIQUE).
    let emailKey: string;
    let displayContact: string;

    if (cleanMethod === "whatsapp") {
      const raw =
        (typeof contact === "string" && contact) ||
        (typeof phone === "string" && phone) ||
        "";
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 8) {
        return NextResponse.json(
          { error: "Teléfono de WhatsApp inválido" },
          { status: 400 },
        );
      }
      emailKey = `wa-${digits}${WHATSAPP_DOMAIN}`;
      displayContact = `+${digits}`;
    } else {
      const raw =
        (typeof contact === "string" && contact) ||
        (typeof email === "string" && email) ||
        "";
      const clean = raw.trim().toLowerCase();
      if (!clean || !clean.includes("@")) {
        return NextResponse.json(
          { error: "Correo inválido" },
          { status: 400 },
        );
      }
      emailKey = clean;
      displayContact = clean;
    }

    const existing = await queryOne<ProjectMember>(
      `SELECT * FROM project_members
       WHERE project_id = $1 AND email = $2`,
      [project_id.trim(), emailKey],
    );

    let invitation: ProjectMember | null;

    if (existing) {
      invitation = await queryOne<ProjectMember>(
        `UPDATE project_members
         SET role = $1
         WHERE project_id = $2 AND email = $3
         RETURNING *`,
        [cleanRole, project_id.trim(), emailKey],
      );
    } else {
      invitation = await queryOne<ProjectMember>(
        `INSERT INTO project_members
          (project_id, email, role, status, invited_by, invited_at)
         VALUES ($1, $2, $3, 'invited', $4, now())
         RETURNING *`,
        [project_id.trim(), emailKey, cleanRole, ownerEmail],
      );
    }

    return NextResponse.json(
      {
        invitation,
        method: cleanMethod,
        contact: displayContact,
        scope: ROLE_TO_SCOPE[cleanRole] ?? "cliente",
      },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    console.error("[invitations] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la invitación" },
      { status: 500 },
    );
  }
}
