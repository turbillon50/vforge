"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function PerfilView() {
  const { user } = useUser();
  const [conn, setConn] = useState<string[]>([]);
  useEffect(() => { fetch("/api/onboarding/status").then(r => r.ok ? r.json() : { connected: [] }).then(d => setConn(d.connected || [])).catch(() => {}); }, []);
  const name = user?.fullName || user?.firstName || user?.username || "";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const services: [string, string][] = [["github", "GitHub"], ["vercel", "Vercel"], ["stripe", "Stripe"]];
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-12 md:px-8">
      <p className="font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.32)", letterSpacing: "0.22em" }}>Tu cuenta</p>
      <h1 className="font-display mb-8 mt-3" style={{ fontSize: "clamp(2rem,5vw,3rem)", letterSpacing: "-0.045em", color: "#f4f4f6", fontWeight: 600 }}>Perfil</h1>
      <div className="glossy flex items-center gap-4 rounded-2xl p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-[20px] font-bold text-white" style={{ background: "radial-gradient(120% 120% at 30% 25%, #a78bfa, #7c3aed)" }}>{(name || "V").charAt(0).toUpperCase()}</div>
        <div><p className="text-[16px] font-semibold text-white">{name || "—"}</p><p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>{email}</p></div>
        <span className="ml-auto rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}>Plan Free</span>
      </div>
      <p className="mb-3 mt-8 font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.32)", letterSpacing: "0.18em" }}>Tus conexiones</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {services.map(([id, label]) => { const on = conn.includes(id); return (
          <div key={id} className="glossy rounded-xl p-4">
            <p className="text-[14px] font-semibold text-white">{label}</p>
            <p className="mt-1 text-[12px]" style={{ color: on ? "#86efac" : "rgba(255,255,255,0.4)" }}>{on ? "Conectado" : "Sin conectar"}</p>
          </div>); })}
      </div>
      <a href="/onboarding" className="mt-6 inline-block rounded-lg px-4 py-2.5 text-[13px] font-semibold" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5)" }}>Gestionar conexiones &rarr;</a>
    </main>
  );
}
