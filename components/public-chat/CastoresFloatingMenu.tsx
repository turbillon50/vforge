"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useMemo, useState } from "react";

export type FloatingMenuItem = {
  href: string;
  label: string;
  desc?: string;
  icon: ReactNode;
  badge?: string | number;
};

export type FloatingMenuUser = {
  name: string;
  roleLabel?: string;
  initials?: string;
};

type CastoresFloatingMenuProps = {
  items: FloatingMenuItem[];
  activeHref?: string;
  user?: FloatingMenuUser;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
  accent?: string;
  className?: string;
  bottomOffset?: string;
};

const OBSIDIAN_BUTTON = {
  bg: "linear-gradient(145deg, #343434 0%, #151515 42%, #050505 100%)",
  glow: "rgba(255,255,255,0.16)",
  sheen:
    "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.09) 54%, transparent 100%)",
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CastoresFloatingMenu({
  items,
  activeHref,
  user,
  onNavigate,
  onLogout,
  accent = "#ffffff",
  className = "",
  bottomOffset = "max(env(safe-area-inset-bottom), 20px)",
}: CastoresFloatingMenuProps) {
  const [open, setOpen] = useState(false);
  const initials = useMemo(
    () => user?.initials || (user?.name ? initialsFromName(user.name) : "V"),
    [user?.initials, user?.name],
  );

  const close = () => setOpen(false);

  const handleNavigate = (href: string) => {
    close();
    if (onNavigate) {
      onNavigate(href);
      return;
    }
    window.location.assign(href);
  };

  return (
    <>
      <div
        className={`fixed left-0 right-0 flex justify-center md:hidden ${open ? "z-[90]" : "z-40"} ${className}`}
        style={{ bottom: bottomOffset, paddingTop: 12 }}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.84 }}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Cerrar widgets" : "Abrir widgets"}
          aria-expanded={open}
          className="relative flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: OBSIDIAN_BUTTON.bg,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.18) inset, 0 0 34px ${OBSIDIAN_BUTTON.glow}, 0 18px 42px rgba(0,0,0,0.55)`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div
              className="absolute left-[15%] right-[15%] top-0 h-[55%] rounded-full"
              style={{ background: OBSIDIAN_BUTTON.sheen }}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 210deg, rgba(255,255,255,0.18) 0deg, transparent 76deg, rgba(255,255,255,0.08) 144deg, transparent 212deg, rgba(255,255,255,0.15) 294deg, transparent 360deg)",
            }}
          />
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className="relative z-10"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              className="h-7 w-7"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </motion.div>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[60] md:hidden"
              style={{
                background: "rgba(0,0,0,0.82)",
                backdropFilter: "blur(24px) saturate(130%) brightness(0.58)",
                WebkitBackdropFilter: "blur(24px) saturate(130%) brightness(0.58)",
              }}
              onClick={close}
            />

            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18, delay: 0.06 }}
              onClick={close}
              className="fixed left-5 top-[max(20px,env(safe-area-inset-top))] z-[70] flex h-10 w-10 items-center justify-center rounded-full md:hidden"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.22)",
                backdropFilter: "blur(12px)",
              }}
              aria-label="Cerrar widgets"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-x-4 z-[70] rounded-[30px] border border-white/10 bg-black/80 p-3 shadow-[0_28px_90px_rgba(0,0,0,.68)] md:hidden"
              style={{
                bottom: "max(env(safe-area-inset-bottom), 20px)",
                paddingBottom: 118,
                backdropFilter: "blur(18px) saturate(130%)",
                WebkitBackdropFilter: "blur(18px) saturate(130%)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="mb-4 flex items-center justify-between px-1"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: "rgba(255,255,255,0.14)",
                        color: accent,
                        border: "1px solid rgba(255,255,255,0.24)",
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-white">{user.name}</p>
                      {user.roleLabel && (
                        <p className="truncate text-[10px] font-medium text-white/50">{user.roleLabel}</p>
                      )}
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        close();
                      }}
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      Salir
                    </button>
                  )}
                </motion.div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                {items.map((item, index) => {
                  const isActive =
                    activeHref === item.href ||
                    (!!activeHref && item.href !== "/" && activeHref.startsWith(`${item.href}/`));

                  return (
                    <motion.button
                      type="button"
                      key={item.href}
                      initial={{ opacity: 0, scale: 0.82, y: 18 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.82, y: 18 }}
                      transition={{
                        delay: 0.04 + index * 0.035,
                        type: "spring",
                        stiffness: 420,
                        damping: 28,
                      }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handleNavigate(item.href)}
                      className="relative flex min-h-[112px] cursor-pointer flex-col items-center gap-2 rounded-2xl p-3 text-center"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.16)",
                        border: isActive
                          ? "1px solid rgba(255,255,255,0.30)"
                          : "1px solid rgba(255,255,255,0.16)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        className="relative flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.10)",
                          color: "rgba(255,255,255,0.96)",
                          border: isActive
                            ? "1px solid rgba(255,255,255,0.28)"
                            : "1px solid rgba(255,255,255,0.16)",
                        }}
                      >
                        {item.icon}
                        {item.badge !== undefined && item.badge !== 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-black">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold leading-tight text-white/90">
                          {item.label}
                        </p>
                        {item.desc && (
                          <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/60">
                            {item.desc}
                          </p>
                        )}
                      </div>
                      {isActive && <div className="absolute bottom-2 h-0.5 w-4 rounded-full bg-white" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export const menuIcon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
    {path}
  </svg>
);
