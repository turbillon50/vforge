// app/api/navegador/route.ts  v3
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const RELAY   = "http://178.105.135.26";
const SECRET  = process.env.BRAIN_SECRET ?? "superclaude2025";
const VNC_BASE = "https://vulcano.vmomentum.site";

// Perfiles multi-cuenta al estilo Chrome — hardcodeados para el owner
const OWNER_PROFILES = [
  { name: "turbillon50",  email: "turbillon50@gmail.com",       color: "#7c3aed", avatar: "T" },
  { name: "dluisdelatorre", email: "dluisdelatorre@gmail.com",  color: "#0891b2", avatar: "D" },
  { name: "luisdelator",  email: "luisdelator@vmomentums.info", color: "#059669", avatar: "L" },
];

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    const owner = isOwnerUser(user as any);

    if (owner) {
      // Owner → siempre la instancia Luis, actualizar clerk_user_id si cambió
      const rows = await sql`
        SELECT id, username, container, port, vnc_password, status
        FROM navegador_instances WHERE username = 'luis'
      `;

      if (rows.length > 0) {
        const inst = rows[0];
        // Actualizar clerk_user_id con el real del turno actual
        await sql`
          UPDATE navegador_instances
          SET clerk_user_id = ${userId}, last_active = NOW(), owner_email = ${email}
          WHERE username = 'luis'
        `;

        return NextResponse.json({
          ok: true,
          status: "active",
          ready: true,
          vnc_url:     `${VNC_BASE}/index.html`,
          handoff_url: `${VNC_BASE}/api/handoff`,
          username:    inst.username,
          vnc_password: inst.vnc_password,
          is_owner:    true,
          profiles:    OWNER_PROFILES,
          active_profile: email,
        });
      }
    }

    // Usuario normal — buscar por userId
    const rows = await sql`
      SELECT id, username, container, port, vnc_password, status
      FROM navegador_instances WHERE clerk_user_id = ${userId}
    `;

    if (rows.length > 0) {
      const inst = rows[0];
      await sql`UPDATE navegador_instances SET last_active=NOW() WHERE clerk_user_id=${userId}`;
      return NextResponse.json({
        ok: true,
        status: inst.status,
        ready: inst.status === "active",
        vnc_url:     `${VNC_BASE}/index.html`,
        handoff_url: `${VNC_BASE}/api/handoff`,
        username:    inst.username,
        is_owner:    false,
        profiles:    [],
      });
    }

    return NextResponse.json({ ok: true, status: "not_provisioned", ready: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    const username = email.split("@")[0]
      .replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20)
      + "_" + userId.slice(-6);

    const existing = await sql`SELECT id FROM navegador_instances WHERE clerk_user_id=${userId}`;
    if (existing.length > 0) return NextResponse.json({ ok: false, error: "Ya tienes una instancia" });

    await sql`
      INSERT INTO navegador_instances (clerk_user_id, username, container, port, vnc_password, status, owner_email)
      VALUES (${userId}, ${username}, ${"vulcano-browser-" + username}, 0, 'provisioning', 'provisioning', ${email})
    `;

    fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: SECRET,
        cmd: `/root/vulcano-browser/provision_user.sh ${username} > /tmp/provision_${username}.log 2>&1`,
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, status: "provisioning", username, eta_seconds: 30 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
