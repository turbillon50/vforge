/**
 * VForge MCP Server — expone el método VForge a clientes MCP
 * (v0, Claude, Cursor). Transport HTTP streamable en /api/mcp.
 *
 * Auth: Authorization: Bearer <VFORGE_MCP_TOKEN> (env). Sin token
 * configurado, el server rechaza todo (cerrado por defecto).
 */
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "brain_search",
      "Busca en el cerebro de VForge: skills de la fábrica, knowledge base (método, ADRs, runbooks, lecciones) y memoria semántica. Devuelve los fragmentos más relevantes para la consulta.",
      { query: z.string().describe("Qué buscar, en lenguaje natural"), limit: z.number().optional().describe("Máx resultados por fuente (default 5)") },
      async ({ query, limit }) => {
        const k = Math.max(1, Math.min(10, limit 
