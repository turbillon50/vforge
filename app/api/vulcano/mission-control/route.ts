// /root/vforge/app/api/vulcano/mission-control/route.ts
// Feed de datos reales para el Mission Control de Luis

import { NextResponse } from "next/server";
import { queryAll, queryOne } from "@/lib/db/client";

export const maxDuration = 30;

async function fetchBrain(path: string, body?: object) {
  const BRAIN = process.env.RELAY_BASE_URL || "http://178.105.135.26";
  const SECRET = process.env.HETZNER_SECRET || "superclaude2025";
  try {
    const r = await fetch(`${BRAIN}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, ...body }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function GET() {
  const [
    projects,
    vState,
    vMemory,
    vProactive,
    episodes,
    recentConvs,
  ] = await Promise.all([
    queryAll(`SELECT name, phase, domain, next_step, blocked, updated_at 
              FROM projects WHERE phase IN ('produccion','activo') 
              ORDER BY updated_at DESC LIMIT 20`).catch(() => []),
    queryOne(`SELECT * FROM v_internal_state ORDER BY id DESC LIMIT 1`).catch(() => null),
    queryAll(`SELECT key, value FROM v_user_memory LIMIT 10`).catch(() => []),
    queryAll(`SELECT suggestion, priority, status, created_at 
              FROM v_proactive WHERE status='pending' 
              ORDER BY priority DESC LIMIT 5`).catch(() => []),
    queryAll(`SELECT title, what_happened, importance, ts 
              FROM v_episodes ORDER BY ts DESC LIMIT 5`).catch(() => []),
    queryAll(`SELECT session_id, role, LEFT(content,100) as content, created_at 
              FROM conversations ORDER BY created_at DESC LIMIT 10`).catch(() => []),
  ]);

  // Datos del Brain (Hetzner)
  const brainData = await fetchBrain("/brain/boot2");
  const enjambreData = await fetchBrain("/brain/query", {
    query: "SELECT id, agent, source, status, LEFT(result,150) as result_preview, created_at FROM dispatch_queue ORDER BY created_at DESC LIMIT 20"
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    v: {
      state: vState,
      memory: vMemory,
      proactive: vProactive,
      episodes,
    },
    projects: projects.map((p: any) => ({
      ...p,
      health: p.blocked ? "blocked" : p.phase === "produccion" ? "live" : "building",
    })),
    brain: {
      skills: brainData?.skills || 0,
      projects_count: brainData?.projects?.length || 0,
      lessons_count: brainData?.lessons?.length || 0,
      recent_memory: brainData?.recent_memory || [],
      top_lessons: brainData?.lessons?.slice(0, 5) || [],
    },
    enjambre: {
      jobs: enjambreData?.rows || [],
      done: enjambreData?.rows?.filter((j: any) => j.status === "done").length || 0,
      running: enjambreData?.rows?.filter((j: any) => j.status === "running").length || 0,
      pending: enjambreData?.rows?.filter((j: any) => j.status === "pending").length || 0,
    },
    conversations: recentConvs,
  });
}
