"use client";

import { PageHeader } from "@/components/workspace/PageHeader";

export default function BlueprintPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        eyebrow="vForge"
        title="Blueprint del Flujo"
        description="La fabrica de apps como sistema: de la idea al cierre. Demo != App, gate de aprobacion, agentes y conectores."
      />
      <iframe
        src="/blueprint.html"
        title="vForge Blueprint"
        className="w-full flex-1 border-0"
        style={{ minHeight: "82vh", background: "#0a0d14" }}
      />
    </div>
  );
}
