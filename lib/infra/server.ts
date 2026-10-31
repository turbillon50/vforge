import "server-only";
import { isInfraSnapshot, type InfraSnapshot } from "./types";

export async function loadInfrastructure(): Promise<{ snapshot: InfraSnapshot; stale: boolean }> {
  const secret = process.env.BRAIN_SECRET;
  if (!secret) throw new Error("source_not_configured");
  const relay = (process.env.HETZNER_URL || process.env.RELAY_BASE_URL || "https://brain.vforge.site").replace(/\/$/, "");
  const response = await fetch(`${relay}/brain/exec`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, cmd: "cat /root/tablero/infra.json" }),
  });
  if (!response.ok) throw new Error("source_unavailable");
  const payload = await response.json();
  const raw = typeof payload.output === "string" ? payload.output : payload.stdout;
  if (typeof raw !== "string" || raw.length > 2_000_000) throw new Error("invalid_source");
  const snapshot: unknown = JSON.parse(raw);
  if (!isInfraSnapshot(snapshot)) throw new Error("invalid_snapshot");
  const age = Date.now() - Date.parse(snapshot.generatedAt);
  return { snapshot, stale: age > 300_000 || age < -60_000 };
}
