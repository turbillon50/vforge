"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "idle" | "unsupported" | "denied" | "subscribed" | "loading" | "error" | "no_vapid";

/**
 * Opt-in a Web Push (VAPID). Pensado para owners en la sala live / app.
 * Requiere HTTPS, SW registrado y NEXT_PUBLIC_VAPID_PUBLIC_KEY.
 */
export function EnablePush({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setStatus("subscribed");
      })
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const keyRes = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
      if (!keyRes.ok) {
        setStatus("no_vapid");
        setMessage("Faltan claves VAPID en el servidor.");
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe_failed");

      // ping de prueba
      await fetch("/api/push/test", { method: "POST" }).catch(() => null);

      setStatus("subscribed");
      setMessage("Listo. Te avisaremos cuando haya mensajes.");
    } catch (e) {
      console.error(e);
      setStatus("error");
      setMessage("No se pudo activar. Revisa permisos del navegador.");
    }
  }, []);

  if (status === "unsupported") {
    return compact ? null : (
      <p className="text-[11px] text-[var(--fg-muted)]">Push no soportado en este dispositivo.</p>
    );
  }

  if (status === "subscribed") {
    return (
      <div className={compact ? "" : "rounded-xl border border-[var(--border-1)] bg-[#f7f7f5] px-3 py-2"}>
        <p className="text-[12px] font-medium">Notificaciones activas</p>
        {!compact && message ? (
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{message}</p>
        ) : null}
      </div>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-[11px] text-[var(--fg-muted)]">
        Notificaciones bloqueadas en el navegador. Actívalas en Ajustes del sitio.
      </p>
    );
  }

  return (
    <div className={compact ? "" : "rounded-xl border border-[var(--border-1)] bg-white px-3 py-2"}>
      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={status === "loading"}
        className="btn-primary !min-h-10 w-full justify-center text-[13px] disabled:opacity-50"
      >
        {status === "loading" ? "Activando…" : "Activar avisos push"}
      </button>
      {message ? <p className="mt-1 text-[11px] text-[var(--fg-muted)]">{message}</p> : null}
      {status === "no_vapid" ? (
        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
          Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel.
        </p>
      ) : null}
    </div>
  );
}
