import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

// Área autenticada: depende de la sesión Clerk en runtime, así que nunca debe
// prerenderizarse estáticamente (si no, el build falla con "useUser must be used
// within <ClerkProvider>" cuando no hay key de Clerk en el entorno de CI).
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
