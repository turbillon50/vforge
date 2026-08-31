import "server-only";

import { queryAll } from "@/lib/db/client";
import { brainQueryAll } from "@/lib/db/brain";
import {
  formatRecallSection,
  recall,
  rememberTurn,
} from "@/lib/forge/semantic-recall";

const BRAIN = (process.env.HETZNER_URL || "http://178.105.135.26").replace(/\/$/, "");
const SECRET = process.env.BRAIN_SECRET || process.env.HETZNER_SECRET || "";

const SAFE_LS = [
  "ls -1 /brain/file/skills-vault/",
  "ls -1 /brain/file/ | head -80",
];

export function wantsFactoryHands(message: string): boolean {
  return /skill|vault|brain|mastra|memoria|vector|terminal|listar|cu[aá]ntas skill|\bls\b/i.test(
    message,
  );
}

async function brainExec(cmd: string): Promise<string> {
  if (!SECRET) return "relay sin secreto";
  const res = await fetch(`${BRAIN}/brain/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, cmd }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return `relay HTTP ${res.status}`;
  const data = (await res.json().catch(() => null)) as {
    stdout?: string;
    stderr?: string;
  } | null;
  const out = `${data?.stdout || ""}\n${data?.stderr || ""}`.trim();
  return out.slice(0, 4000) || "sin salida";
}

export async function loadFactoryCatalog(): Promise<string> {
  const [dbSkills, brainSkills, vault] = await Promise.all([
    queryAll<{ name: string; description: string | null }>(
      `SELECT name, description FROM skills WHERE active = true ORDER BY name LIMIT 80`,
    ).catch(() => [] as Array<{ name: string; description: string | null }>),
    brainQueryAll<{ name: string }>(
      `SELECT name FROM brain_files
        WHERE name ILIKE '%skill%' OR name ILIKE '%vault%' OR name ILIKE '%craft%'
        ORDER BY name LIMIT 80`,
    ).catch(() => [] as Array<{ name: string }>),
    brainExec(SAFE_LS[0]).catch(() => "relay no contestó"),
  ]);

  const lines = [
    "MANOS DE FÁBRICA. Esto ya lo corrió el servidor. No pidas curl al owner.",
    `SKILLS TABLA (${dbSkills.length}):`,
    dbSkills.length
      ? dbSkills.map((row) => `- ${row.name}${row.description ? ` — ${row.description.slice(0, 80)}` : ""}`).join("\n")
      : "- vacía",
    `BRAIN FILES skill/vault/craft (${brainSkills.length}):`,
    brainSkills.length
      ? brainSkills.map((row) => `- ${row.name}`).join("\n")
      : "- ninguno",
    "TERMINAL /brain/file/skills-vault/:",
    vault,
  ];
  return lines.join("\n");
}

export async function loadRoomMemory(projectId: string, message: string): Promise<string> {
  const hits = await recall(`${projectId} ${message}`, 6).catch(() => []);
  const block = formatRecallSection(hits, 0.18);
  if (block.trim()) return block.trim();
  return "MEMORIA SEMÁNTICA/VECTORIAL: sin hits en este turno (Mastra + pgvector + embed Hetzner). Continúa con Brain y la sala.";
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
  if (!wantsFactoryHands(message)) return memory;
  const catalog = await loadFactoryCatalog().catch(
    () => "MANOS DE FÁBRICA: no respondieron en este turno.",
  );
  return `${memory}\n\n${catalog}`;
}
