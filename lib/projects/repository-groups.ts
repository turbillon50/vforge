export const PROJECT_REPOSITORY_ROLES = [
  "app",
  "frontend",
  "backend",
  "api",
  "admin",
  "mobile",
  "infra",
  "docs",
  "shared",
  "other",
] as const;

export type ProjectRepositoryRole = (typeof PROJECT_REPOSITORY_ROLES)[number];

export interface ProjectRepository {
  repo_full_name: string;
  role: ProjectRepositoryRole;
  is_primary: boolean;
  default_branch: string | null;
  private: boolean | null;
  language: string | null;
  html_url: string | null;
  pushed_at: string | null;
}

export const PROJECT_REPOSITORY_ROLE_LABEL: Record<ProjectRepositoryRole, string> = {
  app: "App",
  frontend: "Frontend",
  backend: "Backend",
  api: "API",
  admin: "Administración",
  mobile: "Móvil",
  infra: "Infraestructura",
  docs: "Documentación",
  shared: "Compartido",
  other: "Otro",
};

export function repositoryGroupLabel(
  repoFullName: string,
  role?: string | null,
  isPrimary?: boolean,
): string {
  const key = (role || "app") as ProjectRepositoryRole;
  const roleLabel = PROJECT_REPOSITORY_ROLE_LABEL[key] || role || "App";
  return `${roleLabel} · ${repoFullName}${isPrimary ? " · principal" : ""}`;
}

export function isProjectRepositoryRole(
  value: unknown,
): value is ProjectRepositoryRole {
  return (
    typeof value === "string" &&
    PROJECT_REPOSITORY_ROLES.includes(value as ProjectRepositoryRole)
  );
}


