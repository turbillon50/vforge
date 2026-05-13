/**
 * Slug normalization map.
 * OpenRouter sometimes returns slugs with dots, sometimes with dashes.
 * This map normalizes all known variants to the canonical slug used in MODELS.
 */
export const SLUG_ALIASES: Record<string, string> = {
  // Claude Sonnet 4.6 variants
  "anthropic/claude-sonnet-4-6":              "anthropic/claude-sonnet-4.6",
  "anthropic/claude-4.6-sonnet-20260217":     "anthropic/claude-sonnet-4.6",
  "anthropic/claude-sonnet-4.5":              "anthropic/claude-sonnet-4.6",
  "anthropic/claude-4.5-sonnet-20251022":     "anthropic/claude-sonnet-4.6",
  "anthropic/claude-sonnet-4-5":              "anthropic/claude-sonnet-4.6",

  // Claude Haiku 4.5 variants
  "anthropic/claude-haiku-4-5":              "anthropic/claude-haiku-4.5",
  "anthropic/claude-4.5-haiku-20251022":     "anthropic/claude-haiku-4.5",

  // Claude Opus 4.7 variants
  "anthropic/claude-opus-4-7":              "anthropic/claude-opus-4.7",

  // Gemini variants
  "google/gemini-2.5-flash-preview":        "google/gemini-2.5-flash",
  "google/gemini-2.5-pro-preview":          "google/gemini-2.5-pro",
};

/**
 * Normalize a slug to its canonical form in MODELS.
 * Returns the original slug if no alias is found.
 */
export function normalizeSlug(slug: string): string {
  return SLUG_ALIASES[slug] ?? slug;
}
