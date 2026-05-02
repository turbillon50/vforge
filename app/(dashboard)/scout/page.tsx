"use client";

import { useState } from "react";
import { RECENT_SCOUT } from "@/lib/mock-data";
import { ForgeOrb } from "@/components/ui/forge-orb";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScoutPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Herramienta · Research
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Stack Scout
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Recomendaciones técnicas accionables
        </p>
      </header>

      {/* Big Input Card */}
      <div
        className="bg-vf-bg-1 border border-vf-border rounded-xl p-5 md:p-6 space-y-4 stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        <div className="flex items-center gap-2 text-vf-green mb-2">
          <ForgeOrb size={16} state="idle" glow={false} />
          <span className="font-mono text-xs uppercase tracking-wide">Consulta al Scout</span>
        </div>
        
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pregúntame qué proveedor o stack usar…"
          className="w-full min-h-[100px] bg-vf-bg-2 border border-vf-border-1 rounded-lg px-4 py-3 text-sm text-vf-fg placeholder:text-vf-fg-2 focus:outline-none focus:border-vf-border-2 resize-none transition-colors"
          rows={3}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="bg-vf-green text-black hover:bg-vf-green/90 font-medium w-full sm:w-auto"
          >
            <Compass className="w-4 h-4 mr-2" />
            Consultar
          </Button>
        </div>
      </div>

      {/* Consultas Guardadas */}
      <section>
        <h2 
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 mb-4 stagger-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          Consultas guardadas
        </h2>
        
        {RECENT_SCOUT.length > 0 ? (
          <div className="space-y-3">
            {RECENT_SCOUT.map((item, index) => (
              <div
                key={item.question}
                className="bg-vf-bg-1 border border-vf-border rounded-lg p-4 stagger-fade-up hover:bg-vf-bg-2 transition-colors cursor-pointer"
                style={{ animationDelay: `${250 + index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-vf-fg font-medium text-sm leading-relaxed">
                      {item.question}
                    </p>
                    <p className="text-vf-fg-1 text-sm">
                      {item.answer}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-vf-fg-2 flex-shrink-0">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <ForgeOrb size={120} state="idle" />
            <p className="text-sm text-vf-fg-1 text-center">
              No hay consultas guardadas. Haz tu primera pregunta arriba.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
