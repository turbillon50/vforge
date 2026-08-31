import "server-only";

import { queryAll } from "@/lib/db/client";
import { brainQueryAll } from "@/lib/db/brain";
import { callVServer } from "@/lib/forge/v-server";
import {
  formatRecallSection,
  recall,
  rememberTurn,
} from "@/lib/forge/semantic-recall";

const BRAIN = (process.env.HETZNER_URL || "http://178.105.135.26").replace(/\/$/, "");
const SECRET = process.env.BRAIN_SECRET || process.env.HETZNER_SECRET || "";

const SAFE_CMD =
  /^(ls|cat|head|tail|pwd|whoami|uname|df|free|ps|docker\s+ps|systemctl\s+status)\b/;

export function wantsFactoryHands(message: string): boolean {
  return /skill|vault|brain|mastra|memoria|vector|terminal|hetzner|hertzner|listar|cu[aá]ntas skill|\bls\b|salud|status/i.test(
    message,
  );
}

export async function brainExec(cmd: string): Promise<string> {
  const trimmed = cmd.trim().slice(0, 400);
  if (!SECRET) return "relay sin secreto";
  if (!SAFE_CMD.test(trimmed)) return `comando no permitido: ${trimmed.slice(0, 80)}`;
  const res = await fetch(`${BRAIN}/brain/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, cmd: trimmed }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return `Hetzner /brain/exec HTTP ${res.status}`;
  const data = (await res.json().catch(() => null)) as {
    stdout?: string;
    stderr?: string;
    output?: string;
  } | null;
  const out = `${data?.stdout || data?.output || ""}\n${data?.stderr || ""}`.trim();
  return out.slice(0, 6000) || "sin salida";
}

async function hetznerHealth(): Promise<string> {
  const checks = await Promise.all([
    fetch(`${BRAIN}/health`, { cache: "no-store", signal: AbortSignal.timeout(6000) })
      .then((res) => `brain /health ${res.status}`)
      .catch((error) => `brain /health ${error instanceof Error ? error.message : "down"}`),
    callVServer("/health", {}).then((res) =>
      res.ok ? `v-server ok ${res.status}` : `v-server ${res.status} ${res.error || ""}`,
    ),
    brainExec("ls -1 /brain/file/skills-vault/ | head -40"),
  ]);
  return [
    "HETZNER VIVO. V opera aquí. No hay panel del centro.",
    `relay: ${BRAIN}`,
    checks[0],
    checks[1],
    "skills-vault:",
    checks[2],
  ].join("\n");
}

export async function loadFactoryCatalog(): Promise<string> {
  const [dbSkills, brainSkills, health] = await Promise.all([
    queryAll<{ name: string; description: string | null }>(
      `SELECT name, description FROM skills WHERE active = true ORDER BY name LIMIT 80`,
    ).catch(() => [] as Array<{ name: string; description: string | null }>),
    brainQueryAll<{ name: string }>(
      `SELECT name FROM brain_files
        WHERE name ILIKE '%skill%' OR name ILIKE '%vault%' OR name ILIKE '%craft%'
        ORDER BY name LIMIT 80`,
    ).catch(() => [] as Array<{ name: string }>),
    hetznerHealth().catch(() => "Hetzner no contestó en este turno."),
  ]);

  return [
    health,
    `SKILLS TABLA (${dbSkills.length}):`,
    dbSkills.length
      ? dbSkills.map((row) => `- ${row.name}`).join("\n")
      : "- vacía",
    `BRAIN FILES (${brainSkills.length}):`,
    brainSkills.length ? brainSkills.map((row) => `- ${row.name}`).join("\n") : "- ninguno",
  ].join("\n");
}

export async function loadRoomMemory(projectId: string, message: string): Promise<string> {
  const hits = await recall(`${projectId} ${message}`, 6).catch(() => []);
  const block = formatRecallSection(hits, 0.18);
  if (block.trim()) return block.trim();
  return "MEMORIA SEMÁNTICA/VECTORIAL: sin hits en este turno.";
}

export async function persistRoomMemory(input: {
  projectId: string;
  userText: string;
  assistantText: string;
}): Promise<void> {
  const session = `live:${input.projectId}`;
  await rememberTurn({
    role: "user",
    content: input.userText,
    sessionId: session,
  }).catch(() => null);
  await rememberTurn({
    role: "assistant",
    content: input.assistantText,
    sessionId: session,
  }).catch(() => null);
}

export async function factoryHandsBrief(
  projectId: string,
  message: string,
): Promise<string> {
  const memory = await loadRoomMemory(projectId, message);
  const catalog = await loadFactoryCatalog().catch(
    () => "HETZNER: no respondió en este turno.",
  );
  return `${memory}\n\n${catalog}`;
}
