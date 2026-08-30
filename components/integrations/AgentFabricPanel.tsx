"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconBrain,
  IconCheck,
  IconGlobe,
  IconKey,
  IconLoader,
  IconRefresh,
  IconWifi,
} from "@/components/brand/VFIcons";

interface FabricPayload {
  mcp?: { configured?: boolean; transport?: string; endpoint?: string };
  metamcp?: { configured?: boolean };
  composio?: { configured?: boolean; mode?: string };
  models?: { configured?: boolean };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function AgentFabricPanel() {
  const [fabric, setFabric] = useState<FabricPayload | null>(null);
  const [ojoLive, setOjoLive] = useState<boolean | null>(null);
  const [modelCount, setModelCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [fabricResult, ojoResult, modelsResult] = await Promise.allSettled([
      fetch("/api/integrations/fabric", { cache: "no-store" }),
      fetch("/api/forja/estado", { cache: "no-store" }),
      fetch("/api/brain/models", { cache: "no-store" }),
    ]);

    if (fabricResult.status === "fulfilled" && fabricResult.value.ok) {
      const payload: unknown = await fabricResult.value.json().catch(() => null);
      setFabric(isObject(payload) ? (payload as FabricPayload) : null);
    } else {
      setFabric(null);
    }

    if (ojoResult.status === "fulfilled") {
      const payload: unknown = await ojoResult.value.json().catch(() => null);
      setOjoLive(ojoResult.value.ok && !(isObject(payload) && payload.error));
    } else {
      setOjoLive(false);
    }

    if (modelsResult.status === "fulfilled" && modelsResult.value.ok) {
      const payload: unknown = await modelsResult.value.json().catch(() => null);
      if (isObject(payload) && Array.isArray(payload.models)) {
        const models = new Set(
          payload.models.flatMap((item): string[] =>
            isObject(item) && typeof item.modelo === "string" ? [item.modelo] : [],
          ),
        );
        setModelCount(models.size);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    {
      id: "vforge-mcp",
      name: "VForge MCP",
      eyebrow: "Puerta propia",
      description:
        "Expone herramientas VForge mediante Streamable HTTP, con OAuth o tokens de alcance.",
      detail: fabric?.mcp?.configured ? fabric.mcp.endpoint || "/api/mcp" : "No disponible",
      active: fabric?.mcp?.configured === true,
      Icon: IconKey,
      action: <Link href="/app/settings" className="text-[10px] underline underline-offset-4">Gestionar tokens</Link>,
    },
    {
      id: "metamcp",
      name: "MetaMCP · Ojo",
      eyebrow: "Infraestructura",
      description:
        "Observa el mesh desde el servidor; el token y los ejecutores nunca llegan al navegador.",
      detail: ojoLive === null ? "Comprobando" : ojoLive ? "En línea" : "Sin respuesta",
      active: ojoLive === true && fabric?.metamcp?.configured === true,
      Icon: IconWifi,
      action: <Link href="/app/activity" className="text-[10px] underline underline-offset-4">Ver actividad</Link>,
    },
    {
      id: "models",
      name: "Router de modelos",
      eyebrow: "Motor híbrido",
      description:
        "Claude en Hetzner, OpenRouter y Gemini conservan su cascada real; el estudio muestra cuál respondió.",
      detail: modelCount > 0 ? `${modelCount} modelos registrados` : "Router configurado",
      active: fabric?.models?.configured === true,
      Icon: IconBrain,
      action: <Link href="/app/chat" className="text-[10px] underline underline-offset-4">Abrir estudio</Link>,
    },
    {
      id: "composio",
      name: "Composio",
      eyebrow: "Herramientas externas",
      description:
        "Se incorporará por sesiones para dar herramientas a cada usuario sin sustituir el motor de VForge.",
      detail: fabric?.composio?.configured
        ? "Credencial de plataforma configurada"
        : "Falta COMPOSIO_API_KEY",
      active: fabric?.composio?.configured === true,
      Icon: IconGlobe,
      action: (
        <span className="text-[9px] leading-4 text-[var(--vf-fg-2)]">
          {fabric?.composio?.configured ? "Listo para crear sesiones" : "No se simula una conexión inexistente"}
        </span>
      ),
    },
  ];

  return (
    <section className="border-b border-[var(--vf-border)] bg-[var(--vf-bg-1)] px-5 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mono-label">Tela de agentes</p>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--vf-fg-2)]">
            Motor, MCP e integraciones forman una sola capa operativa. Cada estado de abajo viene de configuración o salud real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="grid h-9 w-9 place-items-center rounded-md border border-[var(--vf-border)]"
          aria-label="Actualizar tela de agentes"
        >
          {loading ? <IconLoader size={12} className="animate-spin" /> : <IconRefresh size={12} />}
        </button>
      </div>

      <div className="grid border-l border-t border-[var(--vf-border)] md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ id, name, eyebrow, description, detail, active, Icon, action }) => (
          <article key={id} className="flex min-h-[230px] flex-col border-b border-r border-[var(--vf-border)] p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-9 w-9 place-items-center border border-[var(--vf-fg)]">
                <Icon size={15} />
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.12em]">
                {active ? <IconCheck size={10} /> : null}
                <span className="status-shape" data-active={active} />
                {active ? "Activo" : "Pendiente"}
              </span>
            </div>
            <p className="mt-5 font-mono text-[7px] uppercase tracking-[0.14em] text-[var(--vf-fg-2)]">{eyebrow}</p>
            <h2 className="mt-2 text-[15px] font-medium">{name}</h2>
            <p className="mt-2 text-[10px] leading-5 text-[var(--vf-fg-2)]">{description}</p>
            <div className="mt-auto border-t border-[var(--vf-border)] pt-4">
              <p className="mb-2 truncate font-mono text-[8px] uppercase tracking-[0.09em] text-[var(--vf-fg-1)]">{detail}</p>
              {action}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
