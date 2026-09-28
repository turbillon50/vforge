"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VMark } from "@/components/brand/VMark";

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
    try {
      if (sessionStorage.getItem(SPLASH_KEY)) return;
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // El splash no depende del almacenamiento para funcionar.
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 560);
    return () => window.clearTimeout(timer);
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
            className="flex items-center gap-3"
          >
            <VMark size={30} />
            <span className="font-display text-[20px] font-semibold tracking-[-0.04em]">
              VForge
            </span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
