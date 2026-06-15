/**
 * Semantic memory for V.
 *
 * Stores embeddings of conversations, decisions, learnings.
 * V learns from interactions and recognizes patterns.
 * Powered by pgvector on Neon.
 */

import { sql } from "./client";
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface SemanticMemory {
  id: string;
  content: string;
  embedding: number[];
  category: "conversation" | "learning" | "decision" | "pattern" | "skill";
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Initialize semantic memory table
 */
export async function initializeSemanticMemory(): Promise<void> {
  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Create semantic_memory table
    await sql`
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id text PRIMARY KEY,
        content text NOT NULL,
        embedding vector(1536),
        category text NOT NULL,
        metadata jsonb DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    // Create index for fast similarity search
    await sql`
      CREATE INDEX IF NOT EXISTS idx_semantic_memory_embedding
      ON semantic_memory USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;

    // Create index for category queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_semantic_memory_category
      ON semantic_memory (category)
    `;
  } catch (e) {
    console.error("[V semantic memory] Initialization failed:", e);
  }
}

/**
 * Generate embedding for text using Claude
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.error("[V semantic memory] No GEMINI_API_KEY — usando fallback hash");
    const hash = text.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const seed = Math.abs(hash);
    const rng = (i: number) => Math.sin(seed + i) * 10000 - Math.floor(Math.sin(seed + i) * 10000);
    return Array.from({ length: 1536 }, (_, i) => (rng(i) % 1));
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: text.slice(0, 2000) }] },
        outputDimensionality: 1536,
      }),
    });
    if (!res.ok) throw new Error(`Gemini embed HTTP ${res.status}`);
    const data = await res.json() as { embedding: { values: number[] } };
    return data.embedding.values;
  } catch (e) {
    console.error("[V semantic memory] Gemini embedding falló:", e);
    return Array(1536).fill(0);
  }
}

/**
 * Store a memory with semantic embedding
 */
export async function storeMemory(
  content: string,
  category: SemanticMemory["category"],
  metadata: Record<string, unknown> = {}
): Promise<SemanticMemory | null> {
  try {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const embedding = await generateEmbedding(content);

    const result = (await sql`
      INSERT INTO semantic_memory (id, content, embedding, category, metadata)
      VALUES (${id}, ${content}, ${JSON.stringify(embedding)}::vector, ${category}, ${JSON.stringify(metadata)})
      RETURNING id, content, category, metadata, created_at
    `) as Array<any>;

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      content: result[0].content,
      embedding,
      category: result[0].category,
      metadata: result[0].metadata,
      created_at: result[0].created_at,
    };
  } catch (e) {
    console.error("[V semantic memory] Store memory failed:", e);
    return null;
  }
}

/**
 * Search semantic memory by similarity
 */
export async function searchMemory(
  query: string,
  limit: number = 5,
  category?: SemanticMemory["category"]
): Promise<SemanticMemory[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    let q = sql`
      SELECT id, content, embedding, category, metadata, created_at
      FROM semantic_memory
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;

    if (category) {
      q = sql`
        SELECT id, content, embedding, category, metadata, created_at
        FROM semantic_memory
        WHERE category = ${category}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${limit}
      `;
    }

    const results = (await q) as Array<any>;

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      embedding: r.embedding,
      category: r.category,
      metadata: r.metadata,
      created_at: r.created_at,
    }));
  } catch (e) {
    console.error("[V semantic memory] Search failed:", e);
    return [];
  }
}

/**
 * Get learnings from semantic memory
 * Returns patterns V has learned
 */
export async function getLearnings(): Promise<SemanticMemory[]> {
  try {
    const results = (await sql`
      SELECT id, content, category, metadata, created_at
      FROM semantic_memory
      WHERE category = 'learning' OR category = 'pattern'
      ORDER BY created_at DESC
      LIMIT 20
    `) as Array<any>;

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      embedding: [],
      category: r.category,
      metadata: r.metadata,
      created_at: r.created_at,
    }));
  } catch (e) {
    console.error("[V semantic memory] Get learnings failed:", e);
    return [];
  }
}

/**
 * Record a decision V made
 */
export async function recordDecision(
  decision: string,
  reasoning: string,
  outcome?: string
): Promise<void> {
  await storeMemory(decision, "decision", {
    reasoning,
    outcome,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Record a pattern V learned
 */
export async function recordPattern(
  pattern: string,
  examples: string[]
): Promise<void> {
  await storeMemory(pattern, "pattern", {
    examples,
    frequency: examples.length,
  });
}
