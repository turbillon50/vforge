import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { CanonicalSettings } from "@/components/v/CanonicalSettings";
import VCanonicalChat from "@/components/v/CanonicalChat";
export const dynamic = "force-dynamic";
export default async function VCanonicalPage() {
  const owner = await resolveRequestOwner();
  if (!owner.isOwner)
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">V canónica</h1>
        <p className="mt-3">
          Este espacio está reservado a la cuenta owner de Luis.
        </p>
      </main>
    );
  return (
    <main className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <CanonicalSettings />
      <div className="min-h-[32rem] flex-1">
        <VCanonicalChat />
      </div>
    </main>
  );
}
