"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  projectName: string;
  onClose?: () => void;
};

export function InviteShare({ projectId, projectName, onClose }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createShare() {
    setLoading(true);
    setError(null);
    setShareUrl(null);
    try {
      const res = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/share`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error === "not_found"
            ? "No tienes permiso de owner en este proyecto"
            : "No se pudo generar el link",
        );
      }
      if (!data.shareUrl) throw new Error("Sin URL");
      setShareUrl(data.shareUrl as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function whatsappHref() {
    if (!shareUrl) return "#";
    const text = [
      `Hola — aquí puedes ver el avance de *${projectName}* en tiempo real:`,
      "",
      shareUrl,
      "",
      "El link es permanente (es tu proyecto). Puedes guardarlo, abrirlo cuando quieras e instalarlo en el teléfono (Safari/Chrome → Añadir a pantalla de inicio).",
      "",
      "Si quieres, crea cuenta gratis en VForge para tenerlo siempre a mano.",
    ].join("\n");
    const digits = phone.replace(/\D/g, "");
    const base = digits.length >= 10 ? `https://wa.me/${digits}` : "https://wa.me/";
    return `${base}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="border border-black bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Link de revisión
          </p>
          <h3 className="mt-1 text-[16px] font-medium tracking-[-0.02em]">
            {projectName}
          </h3>
          <p className="mt-2 max-w-sm text-[12px] leading-5 text-[var(--fg-secondary)]">
            Link permanente, sin email. El cliente entra, ve su app y puede
            instalarla en el teléfono. No se revoca: es su proyecto.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-[var(--fg-muted)] underline underline-offset-4"
          >
            Cerrar
          </button>
        ) : null}
      </div>

      {!shareUrl ? (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              WhatsApp opcional (código país)
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5219981234567"
              className="mt-1.5 min-h-10 w-full border border-[var(--border-1)] bg-[#f7f7f5] px-3 text-[13px]"
            />
          </label>
          {error ? <p className="text-[12px] text-black">{error}</p> : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void createShare()}
            className="btn-primary !min-h-10 !px-4 disabled:opacity-40"
          >
            {loading ? "Generando…" : "Generar link permanente"}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Permanente · sin email · solo este proyecto
          </p>
          <input
            readOnly
            value={shareUrl}
            className="min-h-10 w-full border border-[var(--border-1)] bg-[#f7f7f5] px-3 font-mono text-[11px]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="btn-ghost !min-h-10 !px-4"
            >
              {copied ? "Copiado" : "Copiar link"}
            </button>
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !min-h-10 !px-4 inline-flex items-center"
            >
              Abrir WhatsApp
            </a>
          </div>
          <p className="text-[11px] leading-5 text-[var(--fg-muted)]">
            Sin WhatsApp Business: solo abres WA con el mensaje listo y lo
            mandas. El cliente no necesita cuenta para ver la sala.
          </p>
        </div>
      )}
    </div>
  );
}
