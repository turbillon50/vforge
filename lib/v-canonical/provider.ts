import type { CanonConfig } from "./config";
import { inferenceEndpoint, remoteFetch } from "./network";
export function configuredProvider(config: CanonConfig) {
  const engine = config.engine;
  const key = (
    engine === "custom"
      ? config.customSecret
      : engine === "mesh"
        ? process.env.MESH_API_KEY
        : process.env.CEREBRAS_API_KEY
  )?.trim();
  if (!key) throw Error("V_ENGINE_UNAVAILABLE");
  const base =
    engine === "custom"
      ? config.customEndpoint || ""
      : engine === "mesh"
        ? process.env.MESH_ROUTER_URL || "https://api.mindcontextia.one/mesh"
        : process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1";
  if (!base) throw Error("V_ENGINE_UNAVAILABLE");
  const model =
    config.model ||
    (engine === "mesh"
      ? "auto"
      : process.env.V_CONVERSATION_MODEL || "gpt-oss-120b");
  return { engine, key, model, endpoint: inferenceEndpoint(engine, base) };
}
export async function providerRequest(
  config: CanonConfig,
  body: Record<string, unknown>,
) {
  const p = configuredProvider(config);
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + p.key,
    },
    body: JSON.stringify({ model: p.model, ...body }),
    signal: AbortSignal.timeout(45000),
  };
  return p.engine === "custom"
    ? remoteFetch(p.endpoint, init)
    : fetch(p.endpoint, init);
}
