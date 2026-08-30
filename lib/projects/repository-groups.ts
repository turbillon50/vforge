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

export function isProjectRepositoryRole(
  value: unknown,
): value is ProjectRepositoryRole {
  return (
    typeof value === "string" &&
    PROJECT_REPOSITORY_ROLES.includes(value as ProjectRepositoryRole)
  );
}

