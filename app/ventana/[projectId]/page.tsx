/**
 * /ventana/[projectId] — ventana independiente de la Sala: un dispositivo completo
 * (celular clonado, tablet o escritorio) con la app viva adentro. Se pueden abrir
 * varias a la vez; todas pegan al mismo servidor vivo, así que cada edición se ve
 * en todas por recarga en caliente. Owner-only (middleware + verificación aquí).
 */
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwnerUser } from "@/lib/auth/owner";
import { loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { VentanaDispositivo } from "@/components/live/VentanaDispositivo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventana de la Sala" };

export default async function VentanaPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ device?: string; ruta?: string }>;
}) {
  const { projectId } = await params;
  const { device, ruta } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/ventana/${encodeURIComponent(projectId)}`);

  let owner = false;
  try {
    const cc = await clerkClient();
    owner = isOwnerUser(await cc.users.getUser(userId));
  } catch {
    owner = false;
  }
  if (!owner) redirect("/app");

  const payload = await loadVForgeLiveProject(projectId);
  if (!payload) redirect(`/app/live/${encodeURIComponent(projectId)}`);
  const p = payload.project;

  return (
    <VentanaDispositivo
      projectId={p.id}
      nombre={p.name}
      urlRespaldo={{ movil: p.mobile_url ?? p.desktop_url ?? null, escritorio: p.desktop_url ?? null }}
      dispositivoInicial={device ?? "iphone"}
      rutaInicial={ruta && ruta.startsWith("/") ? ruta : "/"}
    />
  );
}
