"use client";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";

type Choice = { id: string; name: string; href: string };
export function WorkspaceSelector() {
  const pathname = usePathname();
  const id = useId();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/context", { cache: "no-store", signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error("unavailable"); return r.json(); })
      .then((d) => {
        const rows: Choice[] = d.choices;
        setChoices(rows); setError(false);
        const requested = new URLSearchParams(window.location.search).get("space");
        setSelected(pathname?.startsWith("/workspace/casa") && rows.some((c) => c.id === requested)
          ? requested! : d.canSeeFactory ? "factory" : rows[0]?.id || "");
      }).catch((e) => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [pathname]);
  return <div className="flex min-w-0 shrink-0 items-center gap-3 border-t border-[var(--border-1)] bg-[var(--color-surface)] px-4 py-2 md:px-6">
    <label htmlFor={id} className="shrink-0 text-xs text-[var(--fg-secondary)]">Espacio</label>
    <select id={id} value={selected} disabled={choices.length < 2} onChange={(e) => {
      const choice = choices.find((c) => c.id === e.target.value);
      if (choice) window.location.assign(choice.href);
    }} className="min-h-10 w-full min-w-0 max-w-md rounded-md border border-[var(--border-1)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] disabled:opacity-100">
      {!choices.length && <option value="">{error ? "Espacios no disponibles" : "Verificando espacios…"}</option>}
      {choices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  </div>;
}
