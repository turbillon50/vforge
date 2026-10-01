import { HiloPanel } from "@/components/hilo/HiloPanel";
import { IconShield } from "@/components/brand/VFIcons";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { loadHiloDashboardData } from "@/lib/hilo/server";

export const dynamic = "force-dynamic";

export default async function HiloPage() {
  const access = await resolveRequestOwner();
  if (!access.userId || !access.isOwner) {
    return (
      <div className="grid min-h-[calc(100svh-58px)] place-items-center bg-[var(--color-background)] px-5">
        <div className="w-full max-w-md border border-black bg-white p-6">
          <IconShield size={18} />
          <h1 className="mt-4 text-[24px] font-semibold tracking-normal text-black">
            Hilo es solo Owner.
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-[var(--fg-secondary)]">
            Esta vista no carga mensajes, QR ni hallazgos si la sesion no pertenece al propietario.
          </p>
        </div>
      </div>
    );
  }

  const data = await loadHiloDashboardData();
  return <HiloPanel initialData={data} />;
}
