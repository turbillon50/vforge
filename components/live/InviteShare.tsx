"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  projectName: string;
  onClose?: () => void;
};

export function InviteShare({ projectId, projectName, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"observer" | "reviewer">("observer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setLoading(true);
    setError(null);
    setAcceptUrl(null);
    try {
      const res = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role, ttlHours: 168 }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error === "invalid_email"
            ? "Email inválido"
            : data?.error === "not_found"
              ? "No tienes permiso de owner en este proyecto"
              : "No se pudo crear la invitación",
        );
      }
      if (!data.acceptUrl) throw new Error("Sin link de aceptación");
      setAcceptUrl(data.acceptUrl as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al invitar");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!acceptUrl) return;
    await navigator.clipboard.writeText(acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function whatsappHref() {
    if (!acceptUrl) return "#";
    const text = [
      `Hola — te invito a ver el avance de *${projectName}* en tiempo real.`,
      "",
      "Entra a la sala (solo tu proyecto, sin acceso a código ni secretos):",
      acceptUrl,
      "",
      "Puedes dejar comentarios y notificaciones desde ahí.",
      "— VForge",
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
            Invitar cliente
          </p>
          <h3 className="mt-1 text-[16px] font-medium tracking-[-0.02em]">
            {projectName}
          </h3>
          <p className="mt-2 max-w-sm text-[12px] leading-5 text-[var(--fg-secondary)]">
            Genera un link de sala con scope solo a este proyecto. El cliente
            entra, ve previews en vivo y deja mensajes. Sin secretos ni código.
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

      {!acceptUrl ? (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Email del cliente (obligatorio)
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@empresa.com"
              className="mt-1.5 min-h-10 w-full border border-[var(--border-1)] bg-[#f7f7f5] px-3 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              WhatsApp (opcional, con código país)
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5219981234567"
              className="mt-1.5 min-h-10 w-full border border-[var(--border-1)] bg-[#f7f7f5] px-3 text-[13px]"
            />
          </label>
          <div className="flex gap-2">
            {(["observer", "reviewer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  role === r
                    ? "rounded-md border border-black bg-black px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                    : "rounded-md border border-[var(--border-1)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)]"
                }
              >
                {r === "observer" ? "Observador" : "Revisor"}
              </button>
            ))}
          </div>
          {error ? (
            <p className="text-[12px] text-black">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={loading || !email.trim()}
            onClick={() => void createInvite()}
            className="btn-primary !min-h-10 !px-4 disabled:opacity-40"
          >
            {loading ? "Generando…" : "Generar link de sala"}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Link listo · 7 días · un solo uso al aceptar
          </p>
          <input
            readOnly
            value={acceptUrl}
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
              Enviar por WhatsApp
            </a>
          </div>
          <p className="text-[11px] leading-5 text-[var(--fg-muted)]">
            El cliente debe entrar con el mismo email ({email.trim()}). Ahí ve
            solo este proyecto, comenta y recibe la actividad en vivo.
          </p>
          <button
            type="button"
            onClick={() => {
              setAcceptUrl(null);
              setEmail("");
            }}
            className="text-[12px] underline underline-offset-4"
          >
            Invitar a otro
          </button>
        </div>
      )}
    </div>
  );
}
