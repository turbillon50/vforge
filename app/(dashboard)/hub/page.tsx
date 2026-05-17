"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Sparkles, Lock, Boxes, Eye, Search, Plus, X, ArrowRight, FolderPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const osApps = [
  { id: "projects", name: "Proyectos", icon: FolderKanban, color: "from-blue-600 to-indigo-500 shadow-blue-500/20", href: "/projects" },
  { id: "vault", name: "Bóveda V", icon: Lock, color: "from-amber-500 to-orange-400 shadow-amber-500/20", href: "/vault" },
  { id: "modules", name: "Módulos", icon: Boxes, color: "from-purple-600 to-pink-500 shadow-purple-500/20", href: "/modules" },
  { id: "hunter", name: "Repo Hunt", icon: Search, color: "from-emerald-500 to-teal-400 shadow-emerald-500/20", href: "/hunter" },
  { id: "vision", name: "Repo Vision", icon: Eye, color: "from-cyan-500 to-blue-400 shadow-cyan-500/20", href: "/vision" },
  { id: "forge", name: "Forge AI", icon: Sparkles, color: "from-lime-500 to-emerald-400 shadow-lime-500/20", href: "/forge" },
];

export default function HubPage() {
  const [folders, setFolders] = useState([
    { id: "f1", name: "Ecosistema Castores", apps: [
      { id: "c1", name: "Castores App", icon: FolderKanban, color: "from-blue-500 to-indigo-500" },
      { id: "c2", name: "Castores API", icon: Boxes, color: "from-purple-500 to-pink-500" },
    ]},
    { id: "f2", name: "Fractal Core", apps: [
      { id: "fc1", name: "Fractal Engine", icon: Sparkles, color: "from-lime-500 to-emerald-500" },
    ]},
  ]);

  const [activeFolder, setActiveFolder] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders([
      ...folders,
      { id: Date.now().toString(), name: newFolderName, apps: [] }
    ]);
    setNewFolderName("");
    setIsCreateOpen(false);
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-start pt-6 pb-24 px-4 md:px-8 relative select-none">
      
      {/* Dynamic Header */}
      <header className="w-full max-w-2xl mb-14 flex justify-between items-center bg-white/[0.01] border border-white/5 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">vForge OS</h1>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-0.5">Control Panel</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold tracking-wider text-vf-green bg-vf-green/10 border border-vf-green/20 px-3 py-1 rounded-full animate-pulse font-mono">
            V EN LÍNEA
          </div>
        </div>
      </header>

      {/* Main Apple TV / iOS App Grid */}
      <div className="w-full max-w-2xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-6 gap-y-10">
        
        {/* Render Apps with Stunning 3D Glassmorphic Cards */}
        {osApps.map((app, index) => (
          <Link key={app.id} href={app.href} className="flex flex-col items-center gap-3 group">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 20 }}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center relative",
                "bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
                "border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
                "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:opacity-0 before:transition-opacity group-hover:before:opacity-100",
                "transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] group-hover:border-white/20 active:scale-95"
              )}
            >
              {/* Glowing Background Blur Accent */}
              <div className={cn(
                "absolute -inset-0.5 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-40 blur-md transition-all duration-300 pointer-events-none",
                app.color
              )} />
              
              {/* Cinematic Neon Gradient Layer */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-inner border border-white/5",
                app.color
              )}>
                <app.icon className="w-6 h-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
              </div>
            </motion.div>
            <span className="text-[11px] font-semibold text-white/70 group-hover:text-white transition-colors tracking-wide text-center truncate w-full">
              {app.name}
            </span>
          </Link>
        ))}

        {/* Render Folders (Interactive Workspaces) */}
        {folders.map((folder, index) => (
          <button 
            key={folder.id} 
            onClick={() => setActiveFolder(folder)}
            className="flex flex-col items-center gap-3 group focus:outline-none"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (osApps.length + index) * 0.04, type: "spring", stiffness: 260, damping: 20 }}
              className={cn(
                "w-16 h-16 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 shadow-inner p-2.5 grid grid-cols-2 gap-1.5 content-center",
                "transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] group-hover:bg-white/[0.06] active:scale-95"
              )}
            >
              {folder.apps.slice(0, 4).map((app, i) => (
                <div key={i} className={cn("w-full h-full rounded-md bg-gradient-to-br flex items-center justify-center border border-white/5 shadow-[0_2px_4px_rgba(0,0,0,0.2)]", app.color)}>
                  <app.icon className="w-2.5 h-2.5 text-white" />
                </div>
              ))}
              {folder.apps.length === 0 && (
                <div className="col-span-2 flex items-center justify-center h-full w-full">
                  <FolderPlus className="w-5 h-5 text-white/20" />
                </div>
              )}
            </motion.div>
            <span className="text-[11px] font-semibold text-white/70 group-hover:text-white transition-colors tracking-wide text-center truncate w-full">
              {folder.name}
            </span>
          </button>
        ))}

        {/* Add Folder Button */}
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex flex-col items-center gap-3 group focus:outline-none"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (osApps.length + folders.length) * 0.04, type: "spring", stiffness: 260, damping: 20 }}
            className={cn(
              "w-16 h-16 rounded-2xl bg-transparent border-2 border-dashed border-white/10 flex items-center justify-center",
              "transition-all duration-300 group-hover:border-white/30 group-hover:-translate-y-1 group-hover:bg-white/[0.02] active:scale-95 text-white/40 hover:text-white"
            )}
          >
            <Plus className="w-5 h-5" />
          </motion.div>
          <span className="text-[11px] font-semibold text-white/40 group-hover:text-white/70 transition-colors tracking-wide">
            Crear
          </span>
        </button>
      </div>

      {/* Expanded iOS Folder Overlay */}
      <AnimatePresence>
        {activeFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveFolder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            
            {/* Folder Dialog */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 230 }}
              className="relative w-full max-w-md bg-white/[0.04] border border-white/10 rounded-[32px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-white tracking-wide">{activeFolder.name}</h2>
                <button 
                  onClick={() => setActiveFolder(null)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Inside Folder */}
              <div className="grid grid-cols-3 gap-6 py-4">
                {activeFolder.apps.map((app: any) => (
                  <div key={app.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg border border-white/5 transition-transform group-hover:scale-105 active:scale-95", app.color)}>
                      <app.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-white/70 text-center w-full truncate">{app.name}</span>
                  </div>
                ))}
                {activeFolder.apps.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-xs text-white/30 font-medium">
                    Sin proyectos vinculados a este baúl.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl z-10 flex flex-col"
            >
              <h3 className="text-md font-bold text-white mb-4">Crear Nuevo Baúl de Trabajo</h3>
              <input 
                type="text"
                placeholder="Nombre del Baúl (ej: Castores)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-vf-green transition-colors mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateFolder}
                  className="bg-vf-green hover:bg-vf-green-quiet text-black font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-colors active:scale-95"
                >
                  <span>Crear</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
