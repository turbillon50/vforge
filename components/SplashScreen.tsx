"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ForgeMark, GitHubMark, VercelMark } from "@/components/marketing/MonochromeHome";
import "./marketing/monochrome-home.css";

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
    const timer = window.setTimeout(() => setVisible(false), 2350);
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
          transition={{ duration: 0.24 }}
          className="fx-root fixed inset-0 z-[9999] bg-[#0A0A0A] text-white"
        >
          <div className="fx-splash">
            <div className="fx-seq">
              <div className="fx-cimientos">
                <span className="fx-b fx-b-gh">
                  <GitHubMark size={40} />
                </span>
                <span className="fx-b fx-b-vc">
                  <VercelMark size={40} />
                </span>
              </div>
              <div className="fx-nace">
                <ForgeMark size={38} className="fx-tri" />
                <span className="fx-word">VForge</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
