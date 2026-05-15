import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-vault-init
 *
 * Initialize vault with API keys from environment variables
 * Copies OPENROUTER_API_KEY and other secrets to vault_operator_secrets
 */
export async function POST() {
  try {
    // Ensure vault_operator_secrets table exists
    await sql`
      CREATE TABLE IF NOT EXISTS vault_operator_secrets (
        id text PRIMARY KEY,
        name text NOT NULL UNIQUE,
        value text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    // List of environment variables to copy to vault
    const secretsToCopy = [
      "OPENROUTER_API_KEY",
      "GEMINI_API_KEY",
      "ANTHROPIC_API_KEY",
      "GITHUB_TOKEN",
      "VERCEL_TOKEN",
      "NEON_API_KEY",
    ];

    const initialized: string[] = [];
    const skipped: string[] = [];

    for (const secretName of secretsToCopy) {
      const value = process.env[secretName];
      if (!value) {
        skipped.push(secretName);
        continue;
      }

      try {
        // Generate a simple ID
        const id = `vault_${secretName.toLowerCase()}_${Date.now()}`;

        await sql`
          INSERT INTO vault_operator_secrets (id, name, value)
          VALUES (${id}, ${secretName}, ${value})
          ON CONFLICT (name) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = now()
        `;

        initialized.push(secretName);
      } catch (e) {
        console.error(`[vault-init] Failed to store ${secretName}:`, e);
        skipped.push(`${secretName} (error)`);
      }
    }

    return Response.json(
      {
        ok: true,
        message: "✓ Vault initialized from environment variables",
        initialized,
        skipped,
        total: {
          initialized: initialized.length,
          skipped: skipped.length,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[vault-init] Failed:", e);
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
