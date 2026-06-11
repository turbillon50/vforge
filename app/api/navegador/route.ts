// app/api/navegador/route.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { isOwnerUser } from "@/lib/auth/owner";

const sql = neon(process.env.DATABASE_URL!);
const RELAY  = "http://178.105.135.26";
const SECRET = process.env.BRAIN_SECRET ?? "superclaude2025";
const VNC_BASE = "https://vulcano.vmomentum.site";

async function getOrCreateInstance(userId: string, isOwner: boolean, username: string) {
  // Buscar instancia existente
  const rows = await sql`
    SELECT id, username, container, port, vnc_password, status
    FROM navegador_instances
    WHERE clerk_user_id = ${userId}
  `;

  if (rows.length > 0) {
    await sql`UPDATE navegador_instances SET last_active=NOW() WHERE clerk_user_id=${userId}`;
    return rows[0];
  }

  // Owner → asignarle la instancia maestra de Luis
  if (isOwner) {
    await sql`
      INSERT INTO navegador_instances (clerk_user_id, username, container, port, vnc_password, status)
      VALUES (${userId}, 'luis', 'vulcano-browser', 6080, 'Vk-xzR5IW4RJmCinPs2=SNn', 'active')
      ON CONFLICT (username) DO UPDATE SET clerk_user_id=${userId}, last_active=NOW()
    `;
    return { username:"luis", container:"vulcano-browser", port:6080,
             vnc_password:"Vk-xzR5IW4RJmCinPs2=SNn", status:"active" };
  }

  return null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    const user = await currentUser();
    const owner = isOwnerUser(user as any);
    const username = (user?.emailAddresses?.[0]?.emailAddress ?? "")
      .split("@")[0].replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,20);

    const inst = await getOrCreateInstance(userId, owner, username);

    if (!inst) {
      return NextResponse.json({ ok: true, status: "not_provisioned", ready: false });
    }

    return NextResponse.json({
      ok: true,
      status: inst.status,
      ready: inst.status === "active",
      vnc_url: `${VNC_BASE}/`,
      console_url: `${VNC_BASE}/vulcano`,
      handoff_url: `${VNC_BASE}/api/handoff`,
      username: inst.username,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "no auth" }, { status: 401 });

  try {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    const username = email.split("@")[0].replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,20)
      + "_" + userId.slice(-6);

    const existing = await sql`SELECT id FROM navegador_instances WHERE clerk_user_id=${userId}`;
    if (existing.length > 0) return NextResponse.json({ ok:false, error:"Ya tienes una instancia" });

    await sql`
      INSERT INTO navegador_instances (clerk_user_id, username, container, port, vnc_password, status)
      VALUES (${userId}, ${username}, ${"vulcano-browser-"+username}, 0, 'provisioning', 'provisioning')
    `;

    // Disparar provision en Hetzner (fire & forget)
    fetch(`${RELAY}/brain/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, cmd: `/root/vulcano-browser/provision_user.sh ${username} > /tmp/provision_${username}.log 2>&1` }),
    }).catch(() => {});

    return NextResponse.json({ ok:true, status:"provisioning", username, eta_seconds:30 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
