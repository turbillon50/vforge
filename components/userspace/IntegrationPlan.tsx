"use client";

/**
 * "Conexiones de tu proyecto" — el Asistente de Integraciones en la UI.
 *
 * Lee GET /api/integrations/plan, muestra una barra de progreso y la lista
 * de servicios recomendados como filas elegantes. Cada fila se expande
 * (acordeón) a una tarjeta paso-a-paso: por qué lo necesitas, crear cuenta,
 * y conectar — OAuth con un botón, o pegar API key validada inline.
 * Móvil de primera: todo touch >= 44px, un servicio a la vez.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCheck, IconChevD, IconExtLink, IconLink, IconLoader } from "@/components/brand/VFIcons";

type Status = "pending" | "connected" | "skipped";

interface PlanItem {
  id: string;
  name: string;
  why: string;
  connectKind: "oauth" | "paste" | "manual";
  signupUrl: string;
  keyHint: string | null;
  validateHint: string | null;
  oauthStart: string | null;
  connectApi: string | null;
  status: Status;
}

interface PlanResponse {
  items: PlanItem[];
  progress: { done: number; total: number };
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function IntegrationPlan() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/integrations/plan");
      if (r.ok) setData(await r.json());
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-2 px-5 py-6 text-sm text-on-surface-variant">
        <IconLoader className="h-4 w-4 animate-spin" aria-hidden />
        Preparando tus conexiones…
      </div>
    );

  if (!data || data.items.length === 0)
    return (
      <div className="px-5 py-6 text-sm text-on-surface-variant">
        Aún no hay conexiones sugeridas para tu proyecto.
      </div>
    );

  const { done, total } = data.progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="px-4 py-5 sm:px-5">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <IconLink className="h-4 w-4 text-violet-300" aria-hidden />
          <h2 className="font-display text-base font-semibold text-on-surface">
            Conexiones de tu proyecto
          </h2>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          Conéctalas una por una. Sin prisa, en el orden sugerido.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint-1">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-400"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: EASE }}
            />
          </div>
          <span className="text-xs tabular-nums text-on-surface-variant">
            {done}/{total}
          </span>
        </div>
      </header>

      <ul className="space-y-2">
        {data.items.map((item, i) => (
          <Row
            key={item.id}
            item={item}
            index={i + 1}
            expanded={open === item.id}
            onToggle={() => setOpen(open === item.id ? null : item.id)}
            onChanged={load}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  item,
  index,
  expanded,
  onToggle,
  onChanged,
}: {
  item: PlanItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const connected = item.status === "connected";
  return (
    <li className="overflow-hidden rounded-2xl border border-app bg-tint-1/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-tint-2/40"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-app text-xs tabular-nums text-on-surface-variant">
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-on-surface">
            {item.name}
          </span>
          <span className="block truncate text-xs text-on-surface-variant">
            {item.why}
          </span>
        </span>
        {connected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
            <IconCheck className="h-3.5 w-3.5" aria-hidden />
            Conectado
          </span>
        ) : (
          <span className="rounded-full border border-app bg-surface px-2.5 py-1 text-xs text-on-surface-variant">
            Pendiente
          </span>
        )}
        <IconChevD
          className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <StepCard item={item} onChanged={onChanged} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function StepCard({
  item,
  onChanged,
}: {
  item: PlanItem;
  onChanged: () => void;
}) {
  return (
    <div className="border-t border-app px-4 py-4">
      <p className="text-sm text-on-surface-variant">
        <span className="font-medium text-on-surface">Por qué lo necesitas: </span>
        {item.why}
      </p>

      {item.signupUrl && (
        <a
          href={item.signupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-app bg-surface px-4 text-sm text-on-surface transition hover:bg-tint-2"
        >
          Crear cuenta
          <IconExtLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}

      {item.connectKind === "oauth" && item.oauthStart && (
        <div className="mt-3">
          <a
            href={item.oauthStart}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-violet-500/50 bg-violet-500/10 px-4 text-sm text-on-surface transition hover:bg-violet-500/20"
          >
            <IconLink className="h-4 w-4" aria-hidden />
            Conectar
          </a>
          {item.validateHint && (
            <p className="mt-2 text-xs text-on-surface-variant">{item.validateHint}</p>
          )}
        </div>
      )}

      {(item.connectKind === "paste" ||
        (item.connectKind === "manual" && item.connectApi)) && (
        <PasteConnect item={item} onChanged={onChanged} />
      )}

      {item.connectKind === "manual" && !item.connectApi && item.keyHint && (
        <p className="mt-3 rounded-xl border border-app bg-surface px-3 py-2 text-xs text-on-surface-variant">
          {item.keyHint}
        </p>
      )}
    </div>
  );
}

function PasteConnect({
  item,
  onChanged,
}: {
  item: PlanItem;
  onChanged: () => void;
}) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function validate() {
    if (!key.trim() || !item.connectApi) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(item.connectApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) {
        setErr(d.error || "No se pudo validar la llave.");
        return;
      }
      await fetch("/api/integrations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          serviceId: item.id,
          status: "connected",
        }),
      });
      setOk(true);
      setKey("");
      onChanged();
    } catch {
      setErr("Error de red al validar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {item.keyHint && (
        <p className="mb-2 text-xs text-on-surface-variant">{item.keyHint}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Pega tu API key aquí"
          autoComplete="off"
          className="min-h-[44px] flex-1 rounded-full border border-app bg-surface px-4 text-sm text-on-surface outline-none transition focus:border-violet-500/50"
        />
        <button
          type="button"
          onClick={validate}
          disabled={busy || !key.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-violet-500/50 bg-violet-500/10 px-4 text-sm text-on-surface transition hover:bg-violet-500/20 disabled:opacity-50"
        >
          {busy ? <IconLoader className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Validar
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      {ok && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-300">
          <IconCheck className="h-3.5 w-3.5" aria-hidden />
          Conectado correctamente.
        </p>
      )}
    </div>
  );
}
