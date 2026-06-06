"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Transicion suave entre rutas del workspace. Fade + slide minimo para que
 * cambiar de pantalla se sienta como app nativa, no como recarga seca.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-full min-w-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
