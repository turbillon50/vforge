export type PromptTemplateKind = "ui" | "bug" | "copy" | "admin" | "generic";

export function buildTemplatedPrompt(args: {
  kind: PromptTemplateKind;
  projectId: string;
  projectName: string;
  authorLabel: string;
  body: string;
  desktopUrl?: string | null;
  mobileUrl?: string | null;
  adminUrl?: string | null;
}): string {
  const views = [
    args.desktopUrl ? `Web: ${args.desktopUrl}` : null,
    args.mobileUrl ? `Móvil: ${args.mobileUrl}` : null,
    args.adminUrl ? `Admin: ${args.adminUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const focus: Record<PromptTemplateKind, string> = {
    ui: "Enfócate en interfaz, layout, responsive y estados visuales. No cambies lógica de negocio salvo lo imprescindible.",
    bug: "Reproduce y corrige el bug. Incluye causa probable, fix y cómo verificar.",
    copy: "Ajusta textos, tonos y microcopy. No rediseñes layouts.",
    admin: "Trabaja en el panel de administración / rutas /admin. Respeta roles y embed.",
    generic:
      "Convierte el feedback en un cambio concreto y verificable. No inventes requisitos.",
  };

  return `PROYECTO: ${args.projectName} (${args.projectId})
TIPO: ${args.kind.toUpperCase()}

ORIGEN
Comentario de ${args.authorLabel} en sala live VForge.

FEEDBACK
${args.body.trim()}

${views ? `VIEWPORTS\n${views}\n` : ""}FOCO
${focus[args.kind]}

ENTREGA
1. Interpretación breve.
2. Plan de cambio.
3. Criterios de aceptación.
4. Aplica el cambio si tienes herramientas; si no, deja el plan listo.

RESTRICCIONES
- Sin secretos ni otros proyectos.
- Prioriza el viewport que implique el feedback.`;
}
