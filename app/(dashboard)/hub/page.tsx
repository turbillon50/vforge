"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderKanban, Sparkles, Lock, Boxes, Eye, Search, Plus, X, 
  Settings, Link as LinkIcon, Github, Globe, RefreshCw, CheckCircle2, 
  AlertCircle, FileText, Image as ImageIcon, Trash2, HeartHandshake,
  MessageSquare
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Custom Web Audio API Haptic Sound Generator
const playHapticSound = (type = "click") => {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === "click") {
      // Apple-style high-end mechanical click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "success") {
      // Double clean chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // AudioContext blocked
  }
};

interface BentoCard {
  id: string;
  title: string;
  description: string;
  bgImage: string;
  color: string;
  vercelUrl?: string;
  vercelStatus: "active" | "building" | "offline";
  gitRepo?: string;
  gitBranch?: string;
  sisterConnected: boolean;
  assets: Array<{ id: string; name: string; type: "image" | "file" | "link"; url: string }>;
}

const defaultCards: BentoCard[] = [
  {
    id: "c1",
    title: "Ecosistema Castores",
    description: "Plataforma de ventas y logística integral para materiales de construcción.",
    bgImage: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=800",
    color: "from-blue-600 to-indigo-700",
    vercelUrl: "https://castores.vforge.site",
    vercelStatus: "active",
    gitRepo: "turbillon50/castores-production",
    gitBranch: "main",
    sisterConnected: true,
    assets: [
      { id: "a1", name: "Catálogo PDF.pdf", type: "file", url: "#" },
      { id: "a2", name: "Diseño Bento.png", type: "image", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400" }
    ]
  },
  {
    id: "c2",
    title: "RideMe Portal",
    description: "Aplicación premium de transporte y rastreo de flotilla en tiempo real.",
    bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    color: "from-purple-600 to-pink-700",
    vercelUrl: "https://rideme-v1.vercel.app",
    vercelStatus: "building",
    gitRepo: "turbillon50/rideme-portal",
    gitBranch: "dev",
    sisterConnected: true,
    assets: []
  },
  {
    id: "c3",
    title: "Fractal Core OS",
    description: "Núcleo de procesamiento geométrico y analítica avanzada.",
    bgImage: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=800",
    color: "from-emerald-600 to-teal-700",
    vercelUrl: "https://fractal-core.vercel.app",
    vercelStatus: "active",
    gitRepo: "turbillon50/fractal-core",
    gitBranch: "main",
    sisterConnected: false,
    assets: []
  }
];

export default function HubPage() {
  const [cards, setCards] = useState<BentoCard[]>([]);
  const [activeCard, setActiveCard] = useState<BentoCard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCard, setEditedCard] = useState<BentoCard | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Creation States
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBg, setNewBg] = useState("");
  const [newVercel, setNewVercel] = useState("");
  const [newGit, setNewGit] = useState("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vforge_bento_cards");
    if (saved) {
      setCards(JSON.parse(saved));
    } else {
      setCards(defaultCards);
      localStorage.setItem("vforge_bento_cards", JSON.stringify(defaultCards));
    }
  }, []);

  const saveToStorage = (updated: BentoCard[]) => {
    setCards(updated);
    localStorage.setItem("vforge_bento_cards", JSON.stringify(updated));
  };

  const handleCreate = () => {
    playHapticSound("success");
    const newCard: BentoCard = {
      id: Date.now().toString(),
      title: newTitle || "Nuevo Espacio",
      description: newDesc || "Baúl de trabajo personalizado.",
      bgImage: newBg || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
      color: "from-neutral-800 to-neutral-900",
      vercelUrl: newVercel,
      vercelStatus: "active",
      gitRepo: newGit,
      gitBranch: "main",
      sisterConnected: true,
      assets: []
    };

    const updated = [...cards, newCard];
    saveToStorage(updated);
    setIsCreateOpen(false);
    
    // Reset states
    setNewTitle("");
    setNewDesc("");
    setNewBg("");
    setNewVercel("");
    setNewGit("");
  };

  const handleUpdate = () => {
    if (!editedCard) return;
    playHapticSound("success");
    const updated = cards.map(c => c.id === editedCard.id ? editedCard : c);
    saveToStorage(updated);
    setIsEditing(false);
    setActiveCard(editedCard);
  };

  const handleDelete = (id: string) => {
    playHapticSound("click");
    const updated = cards.filter(c => c.id !== id);
    saveToStorage(updated);
    setActiveCard(null);
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-start pt-6 pb-24 px-4 md:px-8 relative select-none">
      
      {/* Top Professional Banner */}
      <header className="w-full max-w-5xl mb-10 flex justify-between items-center bg-white/[0.01] border border-white/5 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-vf-green to-emerald-400 flex items-center justify-center shadow-lg shadow-vf-green/10">
            <Boxes className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">vForge Workspaces</h1>
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Bento Operations Console</p>
          </div>
        </div>
        
        {/* Connection status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 px-3 py-1 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse shadow-[0_0_8px_#7cff3c]" />
            <span className="text-[10px] font-semibold text-white/70 font-mono">Live Sync</span>
          </div>
        </div>
      </header>

      {/* Bento Grid layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Render Workspace Cards */}
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 22 }}
            onClick={() => {
              playHapticSound("click");
              setActiveCard(card);
            }}
            className={cn(
              "relative group overflow-hidden rounded-[28px] border border-white/10 flex flex-col justify-between p-6 cursor-pointer",
              "bg-neutral-900 hover:border-white/20 transition-all duration-300 min-h-[220px]",
              "hover:-translate-y-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] active:scale-[0.98]"
            )}
          >
            {/* Card Background image with smooth blur hover */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500 z-0 pointer-events-none"
              style={{ backgroundImage: `url(${card.bgImage})` }}
            />
            
            {/* Ambient Background Gradient Glow */}
            <div className={cn(
              "absolute -right-16 -top-16 w-36 h-36 rounded-full bg-gradient-to-br opacity-20 blur-2xl group-hover:opacity-40 transition-opacity",
              card.color
            )} />

            {/* Workspace Header */}
            <div className="flex justify-between items-start z-10 w-full mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-md font-bold text-white tracking-wide group-hover:text-vf-green transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] text-white/50 line-clamp-2 max-w-[90%] font-medium">
                  {card.description}
                </p>
              </div>

              {/* V connection icon */}
              {card.sisterConnected && (
                <div 
                  title="Conectado con V Core"
                  className="w-8 h-8 rounded-xl bg-vf-green/10 border border-vf-green/20 flex items-center justify-center text-vf-green shadow-[0_0_15px_rgba(124,255,60,0.1)]"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
              )}
            </div>

            {/* Middle Stats (Vercel & Git Integrations) */}
            <div className="flex flex-col gap-2.5 z-10 w-full my-3">
              {/* Vercel Status */}
              {card.vercelUrl ? (
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-white/70">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate max-w-[140px]">{card.vercelUrl.replace("https://", "")}</span>
                  </div>
                  
                  {/* Deployment Status Pill */}
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1",
                    card.vercelStatus === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                    card.vercelStatus === "building" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  )}>
                    {card.vercelStatus === "active" ? (
                      <>
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        <span>Active</span>
                      </>
                    ) : card.vercelStatus === "building" ? (
                      <>
                        <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping" />
                        <span>Building</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1 h-1 rounded-full bg-red-400" />
                        <span>Offline</span>
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="text-[9px] text-white/30 italic">Sin enlace de Vercel configurado</div>
              )}

              {/* GitHub Link */}
              {card.gitRepo && (
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-white/70">
                    <Github className="w-3.5 h-3.5 text-white/60" />
                    <span className="truncate max-w-[140px]">{card.gitRepo}</span>
                  </div>
                  <span className="text-[9px] text-white/40 font-mono font-bold bg-white/5 px-2 py-0.5 rounded">
                    {card.gitBranch || "main"}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom info (Linked Assets) */}
            <div className="flex justify-between items-center z-10 w-full border-t border-white/5 pt-3">
              <span className="text-[10px] font-bold text-white/40 tracking-wider">
                {card.assets.length} VÍNCULOS
              </span>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                  DETALLES
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Workspace Bento button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => {
            playHapticSound("click");
            setIsCreateOpen(true);
          }}
          className={cn(
            "relative group overflow-hidden rounded-[28px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 cursor-pointer",
            "bg-transparent hover:border-white/30 transition-all duration-300 min-h-[220px]",
            "hover:-translate-y-1.5 active:scale-[0.98] text-white/30 hover:text-white"
          )}
        >
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.01] mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase text-white/40 group-hover:text-white/80 transition-colors">
            Crear Espacio
          </span>
        </motion.div>

      </div>

      {/* Expanded Bento Card Workspace Detail Overlay */}
      <AnimatePresence>
        {activeCard && !isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCard(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 230 }}
              className="relative w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-[32px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
              {/* Blur accent */}
              <div className={cn(
                "absolute -right-20 -top-20 w-48 h-48 rounded-full bg-gradient-to-br opacity-30 blur-3xl pointer-events-none",
                activeCard.color
              )} />

              {/* Detail Header */}
              <div className="flex justify-between items-start z-10 w-full mb-6 pb-6 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white tracking-wide">{activeCard.title}</h2>
                    {activeCard.sisterConnected && (
                      <span className="bg-vf-green/10 text-vf-green text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-vf-green/20">
                        V LINKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1 max-w-[90%] font-medium">{activeCard.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      playHapticSound("click");
                      setEditedCard(activeCard);
                      setIsEditing(true);
                    }}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                    title="Configurar Tarjeta"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveCard(null)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Integrations Stats Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 z-10">
                {/* Vercel Status Info */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[110px]">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vercel Deploy</span>
                    <Globe className="w-4 h-4 text-blue-400" />
                  </div>
                  {activeCard.vercelUrl ? (
                    <div>
                      <a 
                        href={activeCard.vercelUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-semibold text-white hover:text-vf-green underline transition-colors break-all"
                      >
                        {activeCard.vercelUrl}
                      </a>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          activeCard.vercelStatus === "active" ? "bg-emerald-400" : "bg-amber-400 animate-ping"
                        )} />
                        <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase">
                          {activeCard.vercelStatus}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40 italic">Sin vincular</span>
                  )}
                </div>

                {/* Git Status Info */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[110px]">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Git Repository</span>
                    <Github className="w-4 h-4 text-white/60" />
                  </div>
                  {activeCard.gitRepo ? (
                    <div>
                      <div className="text-xs font-semibold text-white break-all">{activeCard.gitRepo}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-bold bg-white/5 px-2 py-0.5 rounded text-white/50">
                          {activeCard.gitBranch || "main"}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono">Sync Active</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40 italic">Sin vincular</span>
                  )}
                </div>
              </div>

              {/* Assets / Connected Materials section */}
              <div className="flex-1 flex flex-col min-h-[200px] overflow-hidden z-10">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-vf-green" />
                  <span>Vinculaciones & Materiales</span>
                </h3>
                
                <div className="flex-1 overflow-y-auto bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                  {activeCard.assets.length > 0 ? (
                    activeCard.assets.map((asset) => (
                      <div key={asset.id} className="flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl px-4 py-2.5 transition-colors">
                        <div className="flex items-center gap-3">
                          {asset.type === "image" ? (
                            <ImageIcon className="w-4 h-4 text-purple-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-xs font-semibold text-white/80">{asset.name}</span>
                        </div>
                        {asset.url && asset.url !== "#" && (
                          <a 
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] font-bold text-vf-green hover:underline uppercase"
                          >
                            Ver Archivo
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/30">
                      <FileText className="w-8 h-8 opacity-20 mb-2" />
                      <p className="text-xs font-medium">No hay fotos, capturas o archivos enlazados.</p>
                      <p className="text-[10px] mt-1 text-white/20">Configura la tarjeta para agregar tus materiales de trabajo.</p>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Configurar Bento Card (Edit workspace properties) */}
      <AnimatePresence>
        {isEditing && editedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-[32px] p-6 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-md font-bold text-white">Configuración del Espacio</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & description */}
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Nombre del Proyecto</label>
                  <input 
                    type="text"
                    value={editedCard.title}
                    onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vf-green"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Descripción</label>
                  <textarea 
                    value={editedCard.description}
                    onChange={(e) => setEditedCard({ ...editedCard, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vf-green min-h-[60px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Imagen de Fondo (URL)</label>
                  <input 
                    type="text"
                    value={editedCard.bgImage}
                    onChange={(e) => setEditedCard({ ...editedCard, bgImage: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vf-green"
                  />
                </div>
              </div>

              {/* Integrations inputs */}
              <div className="flex flex-col gap-4 mb-6 border-t border-white/5 pt-4">
                <h4 className="text-xs font-bold text-vf-green uppercase tracking-widest mb-1">Integraciones Vercel & Git</h4>
                
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Vercel Deployment URL</label>
                  <input 
                    type="text"
                    value={editedCard.vercelUrl || ""}
                    onChange={(e) => setEditedCard({ ...editedCard, vercelUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vf-green"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">GitHub Repository</label>
                    <input 
                      type="text"
                      value={editedCard.gitRepo || ""}
                      onChange={(e) => setEditedCard({ ...editedCard, gitRepo: e.target.value })}
                      placeholder="usuario/repo"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vf-green"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Active Branch</label>
                    <input 
                      type="text"
                      value={editedCard.gitBranch || "main"}
                      onChange={(e) => setEditedCard({ ...editedCard, gitBranch: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-vf-green"
                    />
                  </div>
                </div>

                {/* V Brain connection state */}
                <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-2xl p-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white">Conexión con V Core (Hermana)</span>
                    <span className="text-[9px] text-white/40">Activar canal directo neural de asistencia</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={editedCard.sisterConnected}
                    onChange={(e) => setEditedCard({ ...editedCard, sisterConnected: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-vf-green focus:ring-vf-green"
                  />
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <button 
                  onClick={() => handleDelete(editedCard.id)}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdate}
                    className="bg-vf-green text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 hover:bg-vf-green/80 transition-colors active:scale-95"
                  >
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Crear Espacio (Bento Grid Workspace Creation) */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-[32px] p-6 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-md font-bold text-white mb-4">Crear Nuevo Espacio Bento</h3>
              
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Nombre del Proyecto</label>
                  <input 
                    type="text"
                    placeholder="Ej: Ecosistema Castores"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Descripción Corta</label>
                  <input 
                    type="text"
                    placeholder="Resumen del trabajo de la app..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Imagen URL del Proyecto</label>
                  <input 
                    type="text"
                    placeholder="https://..."
                    value={newBg}
                    onChange={(e) => setNewBg(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors"
                  />
                </div>

                <div className="border-t border-white/5 pt-3">
                  <h4 className="text-xs font-bold text-vf-green uppercase tracking-widest mb-3">Módulos Git & Vercel (Opcional)</h4>
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Liga Vercel</label>
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={newVercel}
                        onChange={(e) => setNewVercel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Repositorio GitHub</label>
                      <input 
                        type="text"
                        placeholder="usuario/repo"
                        value={newGit}
                        onChange={(e) => setNewGit(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate}
                  className="bg-vf-green text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1 transition-colors active:scale-95"
                >
                  <span>Crear Espacio</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
