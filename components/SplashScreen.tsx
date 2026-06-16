"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Splash screen — VULCANO PWA STANDARD v2 §4.
 * Fondo = color principal (void #03020a). Logo fade-in 0.8s, duración fija 2.0s,
 * fade-out 0.3s. Aparece en cada arranque en frío de la PWA.
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000); // 2.0s fija
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#03020a",
          }}
        >
          <motion.img
            src="/icon-512.png"
            alt="VForge"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }} // fade-in 0.8s
            style={{ width: 96, height: 96 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
