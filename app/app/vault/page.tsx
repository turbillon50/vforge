import { EvidenceVaultClient } from "@/components/vault/EvidenceVaultClient";

export const dynamic = "force-dynamic";

export default async function VaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <EvidenceVaultClient initialProject={params?.project} />;
}
