"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ForgeWordmark } from "@/components/brand/ForgeMark";

const SPLASH_KEY = "vf-monochrome-splash-v1";

/* La portada trae su propio splash (MonochromeHome, #fx-splash). Montar también este
   apilaba dos pantallas de carga sobre la misma visita (MUST-500 §17) y, al saltarse el
   de la portada en visitas repetidas, dejaba asomar un destello blanco (§5). */
const CON_SPLASH_PROPIO = new Set(["/"]);

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Se lee al montar, no con usePathname: el splash solo tiene sentido en la carga
    // inicial, y este componente vive en el layout raíz (no se vuelve a montar al navegar).
    if (CON_SPLASH_PROPIO.has(window.location.pathname)) return;

    // Se lee y se escribe ANTES de decidir, y nunca se sale sin haber programado el
    // temporizador: si se salía en medio (como antes), el efecto podía dejar la capa
    // pintada para siempre. Un indicador de carga jamás se queda atorado (MUST-500 §8).
    let yaVisto = false;
    try {
      yaVisto = Boolean(sessionStorage.getItem(SPLASH_KEY));
      if (!yaVisto) sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // El splash no depende del almacenamiento para funcionar.
    }
    if (yaVisto) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 560);
    return () => {
      window.clearTimeout(timer);
      setVisible(false);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-[9999] grid place-items-center bg-white text-black"
        >
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-5"
          >
            {/* Logo aprobado VForge: triángulo invertido + FORGE tracking amplio */}
            <ForgeWordmark size={22} tracking="0.34em" />
            <motion.span
              aria-hidden="true"
              className="block h-[2px] w-24 overflow-hidden rounded-full bg-[#ede9fe]"
            >
              <motion.span
                className="block h-full w-1/3 rounded-full bg-[#7c3aed]"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
