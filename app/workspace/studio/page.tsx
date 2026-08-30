import { ClientShell } from "@/components/workspace/ClientShell";
import { WorkspaceStudio } from "@/components/workspace/WorkspaceStudio";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ClientShell>
      <WorkspaceStudio />
    </ClientShell>
  );
}
