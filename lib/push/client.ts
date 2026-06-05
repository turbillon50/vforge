"use client";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Pide permiso y suscribe al usuario a push. Devuelve true si quedó activo. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Tu navegador no soporta notificaciones push." };
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pub) return { ok: false, error: "Push no configurado en el servidor." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Permiso denegado." };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pub),
  });
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) return { ok: false, error: "No se pudo guardar la suscripción." };
  return { ok: true };
}
