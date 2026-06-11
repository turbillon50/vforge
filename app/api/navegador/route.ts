// app/api/navegador/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const RELAY  = "http://178.105.135.26";
const SECRET = process.env.BRAIN_SECRET ?? "superclaude2025";
const VNC_BASE_URL = "https://vulcano.vmomentum.site";

// GET /api/navegador — obtener o crear instancia del usuario actual
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    // Buscar instancia existente
    const rows = await sql`
      SELECT id, username, container, port, vnc_password, status
      FROM navegador_instances
      WHERE clerk_user_id = ${userId}
    `;

    if (rows.length > 0) {
      const inst = rows[0];
      // Actualizar last_active
      await sql`UPDATE navegador_instances SET last_active=NOW() WHERE clerk_user_id=${userId}`;
      return NextResponse.json({
        ok: true,
        status: inst.status,
        vnc_url: `${VNC_BASE_URL}/`,
        console_url: `${VNC_BASE_URL}/vulcano`,
        handoff_url: `${VNC_BASE_URL}/api/handoff`,
        username: inst.username,
        port: inst.port,
        ready: inst.status === "active",
      });
    }

    // No tiene instancia — iniciar provisioning
    return NextResponse.json({ ok: true, status: "not_provisioned", ready: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/navegador — provisionar nueva instancia
export async function POST() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const email = (sessionClaims?.email as string) ?? "";
  const username = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20) + "_" + userId.slice(-6);

  try {
    // Verificar si ya existe
    const existing = await sql`SELECT id FROM navegador_instances WHERE clerk_user_id=${userId}`;
    if (existing.length > 0) {
      return NextResponse.json({ ok: false, error: "Ya tienes una instancia" });
    }

    // Marcar como provisioning en DB
    await sql`
      INSERT INTO navegador_instances (clerk_user_id, username, container, port, vnc_password, status)
      VALUES (${userId}, ${username}, ${"vulcano-browser-"+username}, 0, 'provisioning', 'provisioning')
    `;

    // Disparar provisioning en Hetzner via brain/exec en background
    const cmd = `/root/vulcano-browser/provision_user.sh ${username} > /tmp/provision_${username}.log 2>&1`;
    await fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd }),
    });

    return NextResponse.json({ ok: true, status: "provisioning", username, eta_seconds: 30 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
