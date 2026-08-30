import { ClientShell } from "@/components/workspace/ClientShell";
import { MemberActivityView } from "@/components/workspace/MemberActivityView";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ClientShell>
      <MemberActivityView />
    </ClientShell>
  );
}
