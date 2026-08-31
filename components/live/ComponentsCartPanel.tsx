"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconLayers, IconLoader, IconTrash, IconX } from "@/components/brand/VFIcons";

interface CartItem {
  id: string;
  component_id: string;
  component_name: string;
  component_kind: string | null;
  added_by_email: string;
  added_at: string;
}

interface CatalogComponent {
  id: string;
  name: string;
  kind: "base" | "pantallas" | "craft";
}

// Catálogo de turbillon50/catalogo-compoentes — 6 base + 11 pantallas + 4 craft.
const CATALOG: CatalogComponent[] = [
  { id: "button", name: "Button", kind: "base" },
  { id: "card", name: "Card", kind: "base" },
  { id: "modal", name: "Modal", kind: "base" },
  { id: "badge", name: "Badge", kind: "base" },
  { id: "input", name: "Input", kind: "base" },
  { id: "select", name: "Select", kind: "base" },
  { id: "chat-screen", name: "ChatScreen", kind: "pantallas" },
  { id: "grid-screen", name: "GridScreen", kind: "pantallas" },
  { id: "list-screen", name: "ListScreen", kind: "pantallas" },
  { id: "detail-screen", name: "DetailScreen", kind: "pantallas" },
  { id: "profile-screen", name: "ProfileScreen", kind: "pantallas" },
  { id: "map-screen", name: "MapScreen", kind: "pantallas" },
  { id: "dashboard-screen", name: "DashboardScreen", kind: "pantallas" },
  { id: "player-screen", name: "PlayerScreen", kind: "pantallas" },
  { id: "calendar-screen", name: "CalendarScreen", kind: "pantallas" },
  { id: "feed-screen", name: "FeedScreen", kind: "pantallas" },
  { id: "login-screen", name: "LoginScreen", kind: "pantallas" },
  { id: "mesh-background", name: "MeshBackground", kind: "craft" },
  { id: "glass-panel", name: "GlassPanel", kind: "craft" },
  { id: "loupe", name: "Loupe", kind: "craft" },
  { id: "liquid-button", name: "LiquidButton", kind: "craft" },
];

const KIND_LABEL: Record<CatalogComponent["kind"], string> = {
  base: "Base",
  pantallas: "Pantallas",
  craft: "Craft",
};

export function ComponentsCartPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const encodedProjectId = encodeURIComponent(projectId);
  const [items, setItems] = useState<CartItem[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/${encodedProjectId}/cart`, { cache: "no-store" });
      if (!response.ok) {
        setError("No se pudo cargar el carrito.");
        return;
      }
      const payload = (await response.json()) as { items: CartItem[]; canWrite: boolean };
      setItems(payload.items || []);
      setCanWrite(Boolean(payload.canWrite));
      setError(null);
    } catch {
      setError("El carrito no está disponible.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const inCart = (componentId: string) => items.some((it) => it.component_id === componentId);

  async function addComponent(component: CatalogComponent) {
    if (!canWrite || busyId) return;
    setBusyId(component.id);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodedProjectId}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: component.id,
          componentName: component.name,
          componentKind: component.kind,
        }),
      });
      if (!response.ok) {
        setError("No se pudo agregar el componente.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo agregar el componente.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: CartItem) {
    if (!canWrite || busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodedProjectId}/cart/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("No se pudo quitar el componente.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo quitar el componente.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-4">
        <div className="flex items-center gap-2 text-violet-600">
          <IconLayers size={13} />
          <h2 className="text-[12px] font-medium text-black">Carrito de componentes</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
          aria-label="Cerrar carrito"
        >
          <IconX size={11} />
        </button>
      </div>

      {!loaded ? (
        <div className="grid flex-1 place-items-center">
          <IconLoader size={14} className="animate-spin" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && <p className="mb-3 text-[11px] text-red-600">{error}</p>}

          <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
            Para este proyecto · {items.length}
          </p>
          {items.length === 0 ? (
            <p className="mb-5 text-[11px] text-[var(--fg-muted)]">
              Todavía no agregas nada. Elige componentes del catálogo abajo.
            </p>
          ) : (
            <div className="mb-5 space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-violet-200 bg-violet-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <IconCheck size={12} className="text-violet-600" />
                    <span className="text-[12px] font-medium">{item.component_name}</span>
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => void removeItem(item)}
                      disabled={busyId === item.id}
                      className="grid h-6 w-6 place-items-center rounded text-[var(--fg-muted)] hover:bg-white hover:text-red-600"
                      aria-label={`Quitar ${item.component_name}`}
                    >
                      <IconTrash size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {(["base", "pantallas", "craft"] as const).map((kind) => (
            <div key={kind} className="mb-5">
              <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                {KIND_LABEL[kind]}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {CATALOG.filter((c) => c.kind === kind).map((component) => {
                  const added = inCart(component.id);
                  return (
                    <button
                      key={component.id}
                      type="button"
                      disabled={!canWrite || added || busyId === component.id}
                      onClick={() => void addComponent(component)}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-2.5 py-2 text-left text-[11px]",
                        added
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-[var(--border-1)] hover:border-violet-400 hover:text-violet-700",
                        !canWrite && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {component.name}
                      {added ? (
                        <IconCheck size={11} />
                      ) : busyId === component.id ? (
                        <IconLoader size={11} className="animate-spin" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!canWrite && (
            <p className="text-[10px] text-[var(--fg-muted)]">
              Solo owner/revisor pueden agregar o quitar componentes.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
