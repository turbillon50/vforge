"use client";

import { ForgeOrb } from "@/components/vforge/forge-orb";

export default function ForgeOrbDemoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 p-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-vf-fg-2">
          COMPONENTE · MASCOTA
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-vf-fg">
          ForgeOrb
        </h1>
        <p className="text-vf-fg-1 text-sm">
          El alma de vForge — animaciones de estado
        </p>
      </div>

      {/* Demo grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        <div className="flex flex-col items-center gap-4">
          <ForgeOrb size={120} state="idle" />
          <div className="text-center">
            <span className="text-vf-fg text-sm font-medium">Idle</span>
            <p className="text-vf-fg-2 text-xs font-mono mt-1">Mirando alrededor</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <ForgeOrb size={120} state="loading" />
          <div className="text-center">
            <span className="text-vf-fg text-sm font-medium">Loading</span>
            <p className="text-vf-fg-2 text-xs font-mono mt-1">Procesando...</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <ForgeOrb size={120} state="happy" />
          <div className="text-center">
            <span className="text-vf-fg text-sm font-medium">Happy</span>
            <p className="text-vf-fg-2 text-xs font-mono mt-1">Deploy exitoso</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <ForgeOrb size={120} state="error" />
          <div className="text-center">
            <span className="text-vf-fg text-sm font-medium">Error</span>
            <p className="text-vf-fg-2 text-xs font-mono mt-1">Build fallido</p>
          </div>
        </div>
      </div>

      {/* Interactive demo */}
      <div className="flex flex-col items-center gap-4 mt-8">
        <ForgeOrb size={180} interactive glow />
        <div className="text-center">
          <span className="text-vf-fg text-sm font-medium">Interactive</span>
          <p className="text-vf-fg-2 text-xs font-mono mt-1">
            Mueve el cursor cerca del orbe
          </p>
        </div>
      </div>

      {/* Size variants */}
      <div className="flex items-end gap-6 mt-8">
        <div className="flex flex-col items-center gap-2">
          <ForgeOrb size={32} glow={false} />
          <span className="text-vf-fg-2 text-[10px] font-mono">32px</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ForgeOrb size={48} glow={false} />
          <span className="text-vf-fg-2 text-[10px] font-mono">48px</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ForgeOrb size={64} glow={false} />
          <span className="text-vf-fg-2 text-[10px] font-mono">64px</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ForgeOrb size={96} />
          <span className="text-vf-fg-2 text-[10px] font-mono">96px</span>
        </div>
      </div>
    </div>
  );
}
