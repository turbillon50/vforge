import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ExpedienteProyectoView,
  ExpedienteShell,
} from "@/components/unicorn/TarjetaProyecto";
import { loadProjectExpedienteById } from "@/lib/unicorn/expediente";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expediente de proyecto",
  description: "Repositorios, infraestructura, actividad y memoria del proyecto.",
};

export default async function ProjectExpedientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expediente = await loadProjectExpedienteById(id).catch(() => null);
  if (!expediente) notFound();

  return (
    <ExpedienteShell>
      <ExpedienteProyectoView expediente={expediente} />
    </ExpedienteShell>
  );
}
