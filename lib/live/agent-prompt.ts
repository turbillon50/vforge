export function isPingInstruction(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 80) return false;
  return /^(di |dec[ií] |responde |solo |solamente )?(listo|hola|ok|ping|s[ií]|aqui|aquí)([.!]*)?$/.test(
    t,
  );
}

export function buildAgentPrompt(args: {
  runId: string;
  projectId: string;
  repo: string;
  baseBranch: string;
  workBranch: string;
  instruction: string;
  role: "planner" | "builder" | "reviewer";
  priorResult?: string | null;
}): string {
  const task = args.instruction.trim();
  if (isPingInstruction(task)) {
    return [
      "PING. No clones repo. No abras ramas. No inventes obra.",
      "Responde sólo lo que pide la tarea, una o dos palabras.",
      "",
      `TAREA\n${task}`,
    ].join("\n");
  }
  const roleRules =
    args.role === "planner"
      ? "Analiza y entrega un plan verificable. NO escribas código ni cambies ramas."
      : args.role === "reviewer"
        ? "Revisa la rama de trabajo, pruebas y riesgos. NO escribas ni hagas merge. Emite APROBADO, REVISION o RECHAZADO con evidencia."
        : "Eres el único escritor. Implementa, prueba y haz push exclusivamente a la rama de trabajo indicada.";
  return `VFORGE RUN ${args.runId}
PROYECTO ${args.projectId}
REPOSITORIO ${args.repo}
RAMA BASE ${args.baseBranch}
RAMA DE TRABAJO ${args.workBranch}
ROL ${args.role.toUpperCase()}

REGLAS OBLIGATORIAS
- ${roleRules}
- Esto es un SANDBOX. Trabaja sólo en ${args.workBranch}. Nunca escribas, hagas push ni merge directo a ${args.baseBranch}.
- No abras un pull request. El owner lo crea al aprobar.
- No despliegues producción.
- No leas ni expongas secretos ajenos al proyecto.
- Reporta archivos tocados, comandos de validación, resultado y bloqueos reales.

TAREA
${task}
${args.priorResult ? `\nCONTEXTO DE LA ETAPA ANTERIOR\n${args.priorResult.slice(0, 8000)}` : ""}`;
}
