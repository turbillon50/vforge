import { ForgeOrbDemo } from "@/components/ui/forge-orb";

export default function ForgeOrbDemoPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2">
          Componente · Mascota
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg">
          ForgeOrb
        </h1>
        <p className="text-vf-fg-1">
          El alma del sistema vForge — anillo verde con ojos que miran, parpadean y responden.
        </p>
      </header>
      
      <ForgeOrbDemo />
    </div>
  );
}
