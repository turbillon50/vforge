import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { CanonicalSettings } from "@/components/v/CanonicalSettings";
export const dynamic = "force-dynamic";
export default async function ConfigurationRoom() {
  const owner = await resolveRequestOwner();
  if (!owner.isOwner)
    return (
      <div className="p-8">Esta sala está reservada a la cuenta owner.</div>
    );
  return <CanonicalSettings room />;
}
