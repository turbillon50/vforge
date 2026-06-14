"use client";
import useSWR from "swr";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

interface SphereResp {
  project: { name: string };
  sphere: {
    level: number;
    stage: string;
    signals: { readiness: number; deploy: number; commits: number; timeline: number };
  };
}

function toneFor(level: number): { core: string; halo: string } {
  if (level >= 100) return { core: "#00E5A0", halo: "rgba(0,229,160,0.55)" };
  if (level >= 76) return { core: "#7C3AED", halo: "rgba(124,58,237,0.55)" };
  if (level >= 51) return { core: "#6366f1", halo: "rgba(99,102,241,0.45)" };
  if (level >= 21) return { core: "#F5A623", halo: "rgba(245,166,35,0.40)" };
  return { core: "#5A5A8A", halo: "rgba(90,90,138,0.35)" };
}

function Sig({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wide text-white/40">{label}</span>
        <span className="text-[9px] font-semibold text-white/55">{v}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ ease: EASE, duration: 0.9 }}
        />
      </div>
    </div>
  );
}

export function ProjectSphere({ projectId }: { projectId: string }) {
  const { data } = useSWR<SphereResp>(
    `/api/my-project/${projectId}/proposito`,
    fetcher,
    { refreshInterval: 30000 },
  );
  const level = data?.sphere.level ?? 0;
  const stage = data?.sphere.stage ?? "Forjando";
  const sig = data?.sphere.signals ?? { readiness: 0, deploy: 0, commits: 0, timeline: 0 };
  const { core, halo } = toneFor(level);
  const scale = 0.7 + (level / 100) * 0.6; // la esfera "sube" con el avance
  const glow = 18 + (level / 100) * 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070510] p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(120% 80% at 50% 0%, ${halo} 0%, transparent 60%)` }} />

      <div className="relative flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Esfera del proyecto</p>

        {/* Orbe */}
        <div className="relative my-3 grid h-[160px] w-[160px] place-items-center">
          <motion.div
            className="absolute rounded-full"
            style={{ width: 120, height: 120, background: halo, filter: `blur(${glow}px)` }}
            animate={{ opacity: [0.6, 0.95, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="relative rounded-full"
            style={{
              width: 110, height: 110,
              background: `radial-gradient(35% 35% at 35% 30%, #ffffff55, transparent 60%), radial-gradient(circle at 50% 50%, ${core}, #0A0A0F 75%)`,
              boxShadow: `0 0 ${glow}px ${halo}, inset 0 0 30px rgba(0,0,0,0.6)`,
            }}
            initial={{ scale: 0.7 }}
            animate={{ scale }}
            transition={{ ease: EASE, duration: 1.1 }}
          >
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-3xl font-black text-white drop-shadow">{level}</span>
            </div>
          </motion.div>
        </div>

        <p className="text-sm font-bold text-white">{stage}</p>
        <p className="text-[10px] text-white/40">nivel calculado del avance real</p>

        <div className="mt-4 flex w-full gap-3">
          <Sig label="Integr." v={sig.readiness} />
          <Sig label="Deploy" v={sig.deploy} />
          <Sig label="Commits" v={sig.commits} />
          <Sig label="Roadmap" v={sig.timeline} />
        </div>
      </div>
    </motion.div>
  );
}
