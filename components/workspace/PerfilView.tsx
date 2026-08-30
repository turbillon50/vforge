"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function PerfilView() {
  const { user } = useUser();
  const [conn, setConn] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => (r.ok ? r.json() : { connected: [] }))
      .then((d) => setConn(d.connected || []))
      .catch(() => {});
  }, []);

  const name = user?.fullName || user?.firstName || user?.username || "";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const services: [string, string][] = [
    ["github", "GitHub"],
    ["vercel", "Vercel"],
    ["stripe", "Stripe"],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 bg-white">
      <p className="font-mono text-xs uppercase tracking-wider text-[var(--fg-secondary)]">
        Tu cuenta
      </p>
      <h1 className="mt-3 mb-8 text-4xl font-bold text-[var(--color-ink)]">
        Perfil
      </h1>

      {/* Profile card */}
      <section className="flex items-center gap-4 rounded-lg border border-[var(--border-1)] bg-white p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border-1)] text-xl font-bold text-[var(--color-ink)]">
          {(name || "V").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-semibold text-[var(--color-ink)]">
            {name || "—"}
          </p>
          <p className="text-sm text-[var(--fg-secondary)]">{email}</p>
        </div>
        <span className="ml-auto rounded-full bg-[var(--border-1)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]">
          Plan Free
        </span>
      </section>

      {/* Connections list */}
      <p className="mt-8 mb-3 font-mono text-xs uppercase tracking-wider text-[var(--fg-secondary)]">
        Tus conexiones
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {services.map(([id, label]) => {
          const on = conn.includes(id);
          return (
            <div
              key={id}
              className="rounded-lg border border-[var(--border-1)] bg-white p-4 text-center"
            >
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {label}
              </p>
              <p
                className={`mt-1 text-xs ${on ? "text-green-400" : "text-[var(--fg-secondary)]"}`}
              >
                {on ? "Conectado" : "Sin conectar"}
              </p>
            </div>
          );
        })}
      </div>

      <a
        href="/workspace/conexiones"
        className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black border border-[var(--border-1)] hover:bg-[var(--border-1)] hover:text-white"
      >
        Gestionar conexiones &rarr;
      </a>
    </main>
  );
}
