"use client";
import { motion, AnimatePresence } from "framer-motion";
import { IconX } from "@/components/brand/VFIcons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ ease: EASE, duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--border-1)] bg-[#0a0a12] p-5 shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:rounded-3xl"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-1)] text-[var(--fg-tertiary)] transition hover:text-[var(--fg-primary)]"
              >
                <IconX size={14} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[var(--fg-tertiary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/50 focus:bg-[var(--surface-1)]";
