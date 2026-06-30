import { ClientShell } from "@/components/workspace/ClientShell";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <ClientShell>
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-12 md:px-8">
        <p className="font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.32)", letterSpacing: "0.22em" }}>Tu trabajo</p>
        <h1 className="font-display mb-6 mt-3" style={{ fontSize: "clamp(2rem,5vw,3rem)", letterSpacing: "-0.045em", color: "#f4f4f6", fontWeight: 600 }}>Mis apps</h1>
        <div className="glossy rounded-2xl p-10 text-center">
          <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.5)" }}>Aún no creas ninguna app.</p>
          <a href="/workspace#crear" className="mt-4 inline-block rounded-lg px-4 py-2.5 text-[13px] font-semibold" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5)" }}>Crear mi primera app &rarr;</a>
        </div>
      </main>
    </ClientShell>
  );
}
