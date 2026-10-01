"use client";

import { TrioStudio } from "@/components/trio/TrioStudio";

/** /app/trio — sólo owner (el middleware protege /app y /api/forge). */
export default function TrioPage() {
  return <TrioStudio />;
}
