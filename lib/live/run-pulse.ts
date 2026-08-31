export function looksLikeOrder(text: string): boolean {
  return /\b(haz|dale|implementa|cambia|arregla|investiga|empieza|manos a la obra|ponte|ejecuta|aplica|propon|sube|corrige)\b/i.test(
    text,
  );
}

export function runnerLooksDead(text: string | null | undefined): boolean {
  const value = (text || "").toLowerCase();
  return (
    value.includes("grok_chat error") ||
    value.includes("command not found") ||
    value.includes("enoent") ||
    value.includes("quota") ||
    value.includes("rate limit")
  );
}

export function pulseLabel(input: {
  status: string;
  summary?: string | null;
  error?: string | null;
  progress?: number;
}): { title: string; detail: string; percent: number; tone: "live" | "wait" | "dead" | "ok" } {
  const blob = `${input.summary || ""}\n${input.error || ""}`;
  if (runnerLooksDead(blob) || input.status === "failed") {
    return {
      title: "Hetzner no arrancó",
      detail: blob.includes("grok_chat")
        ? "Grok CLI falló en el servidor. El chat de V no es el runner."
        : (input.error || "El job murió sin log útil.").slice(0, 180),
      percent: 100,
      tone: "dead",
    };
  }
  if (input.status === "running" || input.status === "queued" || input.status === "preparing") {
    const percent = Math.max(6, Math.min(92, input.progress || 12));
    return {
      title: input.status === "running" ? "Grok está en Hetzner" : "En cola de Hetzner",
      detail: "Si esta barra no se mueve en un minuto, el daemon no tomó el job.",
      percent,
      tone: "live",
    };
  }
  if (input.status === "awaiting_approval" || input.status === "preview_ready" || input.status === "awaiting_preview") {
    return {
      title: "Listo para Aplicar",
      detail: "El runner ya soltó resultado. Revísalo y aplica si sí.",
      percent: 100,
      tone: "wait",
    };
  }
  if (input.status === "published" || input.status === "approved") {
    return { title: "Aplicado", detail: "Ya está en la rama.", percent: 100, tone: "ok" };
  }
  return {
    title: input.status,
    detail: (input.summary || input.error || "Sin log.").slice(0, 180),
    percent: input.progress || 0,
    tone: "wait",
  };
}
