"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  IconLoader,
  IconCheck,
  IconWarn,
  IconArrowR,
} from "@/components/brand/VFIcons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
type State = "accepting" | "ok" | "error";

export function JoinClient({ projectId }: { projectId: string }) {
  const [state, setState] = useState<State>("accepting");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok) {
          setState("ok");
          setTimeout(() => {
            window.location.href = `/workspace/proyecto/${projectId}`;
          }, 1200);
        } else {
          setState("error");
          setMessage(data.error ?? "No se pudo aceptar la invitación");
        }
      } catch {
        if (alive) {
          setState("error");
          setMessage("Error de conexión");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#03020a] px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ease: EASE }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a12] p-8 text-center"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        {state === "accepting" && (
          <>
            <IconLoader size={30} className="mx-auto mb-4 animate-spin text-violet-400" />
            <h1 className="text-lg font-bold text-white">Uniéndote al proyecto…</h1>
            <p className="mt-1 text-[13px] text-white/40">Un momento.</p>
          </>
        )}
        {state === "ok" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/12">
              <IconCheck size={26} className="text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold text-white">¡Listo! Bienvenido</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-white/40">
              Entrando a tu portal <IconArrowR size={13} />
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/12">
              <IconWarn size={24} className="text-amber-400" />
            </div>
            <h1 className="text-lg font-bold text-white">No pudimos entrar</h1>
            <p className="mt-1 text-[13px] text-white/45">{message}</p>
            <p className="mt-3 text-[11px] text-white/30">
              Verifica que iniciaste sesión con el correo al que te invitaron.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
