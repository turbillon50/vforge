"use client";

import { motion } from "framer-motion";
import { FolderKanban, Sparkles, Lock, Boxes, Eye, Search, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const osApps = [
  { id: "projects", name: "Proyectos", icon: FolderKanban, color: "bg-blue-500/20 text-blue-500", href: "/projects" },
  { id: "vault", name: "Bóveda V", icon: Lock, color: "bg-amber-500/20 text-amber-500", href: "/vault" },
  { id: "modules", name: "Módulos", icon: Boxes, color: "bg-purple-500/20 text-purple-500", href: "/modules" },
  { id: "hunter", name: "Repo Hunt", icon: Search, color: "bg-emerald-500/20 text-emerald-500", href: "/hunter" },
  { id: "vision", name: "Repo Vision", icon: Eye, color: "bg-indigo-500/20 text-indigo-500", href: "/vision" },
  { id: "forge", name: "Forge AI", icon: Sparkles, color: "bg-vf-green/20 text-vf-green", href: "/forge" },
];

export default function HubPage() {
  const [folders, setFolders] = useState([
    { id: "f1", name: "Ecosistema Castores", apps: 3 },
    { id: "f2", name: "Fractal Core", apps: 2 },
  ]);

  return (
    <div className="h-full flex flex-col items-center justify-start pt-10 pb-24 px-6 relative">
      <header className="w-full mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-vf-fg">vForge OS</h1>
          <p className="text-sm text-vf-fg-2">Sistema Operativo Anillo 0</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-vf-green animate-pulse">V EN LÍNEA</div>
        </div>
      </header>

      {/* iOS App Grid */}
      <div className="w-full max-w-md grid grid-cols-4 gap-x-4 gap-y-8">
        {/* Render Apps */}
        {osApps.map((app, index) => (
          <Link key={app.id} href={app.href} className="flex flex-col items-center gap-2 group">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-lg transition-transform group-hover:scale-105 active:scale-95",
                app.color,
                "bg-gradient-to-br from-white/5 to-transparent"
              )}
            >
              <app.icon className="w-7 h-7 drop-shadow-md" />
            </motion.div>
            <span className="text-[11px] font-medium text-vf-fg-1 tracking-wide">{app.name}</span>
          </Link>
        ))}

        {/* Render Folders (Workspaces) */}
        {folders.map((folder, index) => (
          <button key={folder.id} className="flex flex-col items-center gap-2 group">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (osApps.length + index) * 0.05, type: "spring", stiffness: 300 }}
              className="w-16 h-16 rounded-2xl bg-vf-bg-2/50 backdrop-blur-md border border-white/5 shadow-inner p-2 grid grid-cols-2 gap-1 content-start transition-transform group-hover:scale-105 active:scale-95"
            >
              <div className="w-full h-full bg-blue-500/40 rounded-sm" />
              <div className="w-full h-full bg-amber-500/40 rounded-sm" />
              <div className="w-full h-full bg-vf-green/40 rounded-sm" />
            </motion.div>
            <span className="text-[11px] font-medium text-vf-fg-1 tracking-wide">{folder.name}</span>
          </button>
        ))}

        {/* Add Folder Button */}
        <button className="flex flex-col items-center gap-2 group">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (osApps.length + folders.length) * 0.05, type: "spring", stiffness: 300 }}
            className="w-16 h-16 rounded-2xl bg-transparent border-2 border-dashed border-vf-border-1 flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 text-vf-fg-2 hover:text-vf-fg"
          >
            <Plus className="w-6 h-6" />
          </motion.div>
          <span className="text-[11px] font-medium text-vf-fg-2 tracking-wide">Crear</span>
        </button>
      </div>

    </div>
  );
}
