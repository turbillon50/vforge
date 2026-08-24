/** Helpers de selección de proyecto activo en el Estudio.
 *  Construir no debe abrir un proyecto concreto por defecto.
 */

export function resolveActiveProjectId(
  preferredId: string | undefined,
  current: string,
  availableIds: string[],
): string {
  const candidate = preferredId || current;
  if (candidate && availableIds.includes(candidate)) return candidate;
  return "";
}

export function persistActiveProjectId(id: string) {
  if (typeof window === "undefined") return;
  if (id) {
    window.localStorage.setItem("vforge.activeProject", id);
  } else {
    window.localStorage.removeItem("vforge.activeProject");
  }
}
