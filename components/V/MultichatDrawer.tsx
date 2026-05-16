"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Plus, Terminal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MultichatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MultichatDrawer({ isOpen, onClose }: MultichatDrawerProps) {
  const [threads, setThreads] = useState([
    { id: "1", title: "General", active: true },
    { id: "2", title: "Repo Rescue: VForge", active: false },
    { id: "3", title: "DNS Config Name.com", active: false },
  ]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[400px] bg-vf-bg-1/90 backdrop-blur-3xl border-l border-vf-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-vf-border/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-vf-green" />
                <h2 className="font-semibold text-vf-fg">Hilos de V</h2>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-full hover:bg-vf-bg text-vf-green">
                  <Plus className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-vf-bg text-vf-fg-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-vf-fg-2 mb-3 px-2 font-mono">
                Conversaciones Activas
              </div>
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                    thread.active 
                      ? "bg-vf-green/10 border border-vf-green/30 text-vf-green" 
                      : "hover:bg-vf-bg border border-transparent text-vf-fg-1"
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium truncate">{thread.title}</span>
                </button>
              ))}
            </div>
            
            {/* V Status Footer */}
            <div className="p-4 border-t border-vf-border/50 bg-vf-bg-2/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-vf-green animate-pulse" />
                <span className="text-xs font-mono text-vf-green">ANILLO 0 • EN LÍNEA</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
