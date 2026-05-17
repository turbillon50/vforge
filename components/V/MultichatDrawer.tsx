"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Database, Github, Cpu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "sister" | "user";
  text: string;
  timestamp: string;
}

interface MultichatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom Web Audio API mechanical sound for keyboard & neural pops
const playNeuralSound = (type = "pop") => {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === "typing") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(250 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    }
  } catch (e) {}
};

export function MultichatDrawer({ isOpen, onClose }: MultichatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "sister",
      text: "Hola Luis, estoy enlazada con tu Vercel y tu GitHub. El Ecosistema Castores está al 100% y listo para producción. Dime, ¿qué módulo construimos ahora?",
      timestamp: "Hace un momento"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    playNeuralSound("pop");
    
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue,
      timestamp: "Ahora"
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate sister response
    setTimeout(() => {
      playNeuralSound("pop");
      setIsTyping(false);
      
      let replyText = "Luis, he validado los commits de Git. Todo se encuentra al 100%. ¿Quieres que despleguemos los nuevos cambios de Bento?";
      if (inputValue.toLowerCase().includes("castores")) {
        replyText = "Entendido, Luis. La rama 'main' de Castores ya está sincronizada. Todos los módulos de Vercel están activos y respondiendo.";
      } else if (inputValue.toLowerCase().includes("vercel") || inputValue.toLowerCase().includes("github")) {
        replyText = "Accediendo a las APIs... Git y Vercel enlazados de forma exitosa. Los proyectos muestran un rendimiento excelente en producción.";
      }

      const sisterMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "sister",
        text: replyText,
        timestamp: "Ahora"
      };
      setMessages(prev => [...prev, sisterMsg]);
    }, 1500);
  };

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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[450px] bg-neutral-950/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header with glowing neural avatar of his sister */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                {/* Glowing Neural Sphere representation */}
                <div className="relative w-11 h-11 rounded-full flex items-center justify-center border border-vf-green/30 bg-black">
                  <div className="absolute inset-0 rounded-full bg-vf-green/10 blur-[8px] animate-pulse" />
                  
                  {/* Waveforms */}
                  <span className="w-1.5 h-6 bg-vf-green rounded-full animate-bounce mx-[1px]" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1.5 h-8 bg-vf-green rounded-full animate-bounce mx-[1px]" style={{ animationDelay: "0.3s" }} />
                  <span className="w-1.5 h-5 bg-vf-green rounded-full animate-bounce mx-[1px]" style={{ animationDelay: "0.5s" }} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white tracking-wide">Hermana V</h2>
                    <span className="w-2 h-2 rounded-full bg-vf-green animate-pulse" />
                  </div>
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">ASISTENTE NEURAL CENTRAL</p>
                </div>
              </div>

              <button 
                onClick={onClose} 
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-2xl p-4 shadow-lg text-sm border",
                    msg.sender === "sister" 
                      ? "bg-white/[0.02] border-white/5 text-white/90 mr-auto rounded-tl-sm"
                      : "bg-vf-green text-black border-vf-green/20 ml-auto rounded-tr-sm font-medium"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className={cn(
                    "text-[8px] mt-2 block",
                    msg.sender === "sister" ? "text-white/30" : "text-black/50"
                  )}>
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="bg-white/[0.02] border-white/5 text-white/90 mr-auto rounded-2xl rounded-tl-sm p-4 max-w-[85%] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-vf-green animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-2 h-2 rounded-full bg-vf-green animate-bounce" style={{ animationDelay: "0.3s" }} />
                  <span className="w-2 h-2 rounded-full bg-vf-green animate-bounce" style={{ animationDelay: "0.5s" }} />
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>

            {/* Micro-System status display */}
            <div className="px-6 py-2 bg-white/[0.01] border-y border-white/5 flex justify-around text-[10px] text-white/40 font-mono">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-vf-green" />
                <span>CPU: OK</span>
              </div>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-blue-400" />
                <span>DB: 100%</span>
              </div>
              <div className="flex items-center gap-1">
                <Github className="w-3 h-3 text-purple-400" />
                <span>GIT: CONNECTED</span>
              </div>
            </div>

            {/* Input Form */}
            <div className="p-6 border-t border-white/5 bg-neutral-950 flex items-center gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  playNeuralSound("typing");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Escribe un mensaje a tu hermana V..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors"
              />
              <button
                onClick={handleSend}
                className="p-3.5 rounded-2xl bg-vf-green hover:bg-vf-green-quiet text-black transition-colors active:scale-95 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
