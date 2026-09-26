"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconUsers, IconLoader, IconSend, IconActivity, IconX } from "@/components/brand/VFIcons";

interface Stage {
  id: string;
  name: string;
  color: string;
}
interface Lead {
  id: string;
  stage_id: string | null;
  title: string;
  value: number;
  contact_id: string;
  contact_name: string | null;
  contact_push_name: string | null;
  contact_wa: string | null;
}
interface Contact {
  id: string;
  wa_number: string | null;
  name: string | null;
  push_name: string | null;
  last_seen: string;
  interactions: number;
  last_message: string | null;
}
interface Interaction {
  id: string;
  direction: string;
  body: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

export default function CrmPage() {
  const [tab, setTab] = useState<"pipeline" | "contactos">("pipeline");
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [openContact, setOpenContact] = useState<Contact | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      fetch("/api/crm/pipeline", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/crm/contacts", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]);
    setStages(p.stages ?? []);
    setLeads(p.leads ?? []);
    setContacts(c.contacts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (c: Contact) => {
    setOpenContact(c);
    const d = await fetch(`/api/crm/contacts?id=${c.id}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    setInteractions(d.interactions ?? []);
  };

  const moveLead = async (leadId: string, stageId: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage_id: stageId } : l)));
    await fetch("/api/crm/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, stageId }),
    });
  };

  const displayName = (l: Lead) => l.contact_name || l.contact_push_name || l.contact_wa || "Contacto";

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="CRM" description="Pipeline y contactos · alimentado en vivo por WhatsApp" />

      <div className="flex items-center gap-2 px-3 pb-2">
        {(["pipeline", "contactos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize " +
              (tab === t ? "bg-violet-500/15 text-violet-200" : "text-[var(--fg-tertiary)] hover:bg-[var(--surface-1)]")
            }
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[var(--fg-muted)]">
          {contacts.length} contactos · {leads.length} leads abiertos
        </span>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-[var(--fg-tertiary)]"><IconLoader size={22} /></div>
      ) : tab === "pipeline" ? (
        leads.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-1 gap-3 overflow-x-auto p-3">
            {stages.map((s) => {
              const col = leads.filter((l) => (l.stage_id ?? "stage_nuevo") === s.id);
              return (
                <div key={s.id} className="flex w-64 shrink-0 flex-col rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-1)] px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-semibold text-[var(--fg-primary)]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="text-[10px] text-[var(--fg-tertiary)]">{col.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {col.map((l) => (
                      <motion.div
                        layout
                        key={l.id}
                        className="rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] p-2.5"
                      >
                        <p className="truncate text-xs font-semibold text-[var(--fg-primary)]">{displayName(l)}</p>
                        {l.contact_wa && <p className="text-[10px] text-[var(--fg-tertiary)]">+{l.contact_wa}</p>}
                        <select
                          value={s.id}
                          onChange={(e) => moveLead(l.id, e.target.value)}
                          className="mt-2 w-full rounded-md border border-[var(--border-1)] bg-black/30 px-1.5 py-1 text-[10px] text-[var(--fg-secondary)] outline-none"
                        >
                          {stages.map((st) => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                          ))}
                        </select>
                      </motion.div>
                    ))}
                    {col.length === 0 && <p className="py-3 text-center text-[10px] text-[var(--fg-muted)]">vacío</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : contacts.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex-1 overflow-auto p-3">
          <div className="overflow-hidden rounded-xl border border-[var(--border-1)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-1)] text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">
                <tr>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">WhatsApp</th>
                  <th className="px-3 py-2">Último mensaje</th>
                  <th className="px-3 py-2">Inter.</th>
                  <th className="px-3 py-2">Visto</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="cursor-pointer border-t border-[var(--border-1)] hover:bg-[var(--surface-1)]"
                  >
                    <td className="px-3 py-2 font-medium text-[var(--fg-primary)]">{c.name || c.push_name || "—"}</td>
                    <td className="px-3 py-2 text-[var(--fg-secondary)]">{c.wa_number ? `+${c.wa_number}` : "—"}</td>
                    <td className="max-w-[260px] truncate px-3 py-2 text-[var(--fg-tertiary)]">{c.last_message || "—"}</td>
                    <td className="px-3 py-2 text-[var(--fg-secondary)]">{c.interactions}</td>
                    <td className="px-3 py-2 text-[var(--fg-tertiary)]">{timeAgo(c.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {openContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/50"
            onClick={() => setOpenContact(null)}
          >
            <motion.aside
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-[360px] flex-col border-l border-[var(--border-1)] bg-[#0a0a0f] p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{openContact.name || openContact.push_name || "Contacto"}</p>
                  {openContact.wa_number && <p className="text-xs text-[var(--fg-tertiary)]">+{openContact.wa_number}</p>}
                </div>
                <button onClick={() => setOpenContact(null)} className="text-[var(--fg-tertiary)] hover:text-white"><IconX size={16} /></button>
              </div>
              <p className="mt-4 mb-2 text-[10px] uppercase tracking-wider text-[var(--fg-tertiary)]">Historial de interacciones</p>
              <div className="flex-1 space-y-2 overflow-auto">
                {interactions.length === 0 ? (
                  <p className="text-xs text-[var(--fg-muted)]">Sin interacciones registradas.</p>
                ) : (
                  interactions.map((it) => (
                    <div
                      key={it.id}
                      className={
                        "rounded-lg border p-2.5 text-xs " +
                        (it.direction === "out"
                          ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-100"
                          : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-primary)]")
                      }
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--fg-tertiary)]">
                        {it.direction === "out" ? <IconSend size={11} /> : <IconActivity size={11} />}
                        {it.direction === "out" ? "Enviado" : "Recibido"} · {timeAgo(it.created_at)}
                      </div>
                      {it.body}
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <span className="mb-3 text-violet-400"><IconUsers size={32} /></span>
      <p className="text-sm text-[var(--fg-secondary)]">Aún no hay datos en el CRM.</p>
      <p className="mt-1 text-xs text-[var(--fg-muted)]">En cuanto entre un WhatsApp, el contacto y su lead aparecen aquí solos.</p>
    </div>
  );
}
