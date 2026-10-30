import { queryAll } from "@/lib/db/client";
import { parseChart, type ChartArtifact } from "./charts";
let ensured: Promise<void> | undefined;
function ensure() {
  return (ensured ??= (async () => {
    await queryAll(
      "CREATE TABLE IF NOT EXISTS v_canonical_artifacts(message_id text PRIMARY KEY,session_id text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())",
    );
  })().catch((e) => {
    ensured = undefined;
    throw e;
  }));
}
export async function saveArtifacts(
  session: string,
  messageId: string,
  values: ChartArtifact[],
) {
  if (!values.length) return;
  await ensure();
  const safe = values.slice(0, 4).map(parseChart);
  await queryAll(
    "INSERT INTO v_canonical_artifacts(message_id,session_id,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(message_id) DO NOTHING",
    [messageId, session, JSON.stringify(safe)],
  );
}
export async function sessionArtifacts(
  session: string,
): Promise<Record<string, ChartArtifact[]>> {
  await ensure();
  const rows = await queryAll<{ message_id: string; payload: unknown }>(
    "SELECT message_id,payload FROM v_canonical_artifacts WHERE session_id=$1",
    [session],
  );
  return Object.fromEntries(
    rows.map((r) => [
      r.message_id,
      Array.isArray(r.payload) ? r.payload.map(parseChart) : [],
    ]),
  );
}
