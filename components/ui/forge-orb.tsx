"use client";
import { motion, useReducedMotion, useAnimationControls } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

type ForgeOrbState = "idle" | "loading" | "thinking" | "happy" | "error" | "success" | "listening";

type ForgeOrbProps = {
  size?: number;
  state?: ForgeOrbState;
  intensity?: number; // 0-1, how hard it's working (affects pulse speed & color shift)
  glow?: boolean;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
};

// Color palette for different states and intensity levels
const COLORS = {
  green: "#7CFF3C",
  greenSoft: "rgba(124, 255, 60, 0.6)",
  cyan: "#00F5FF",
  yellow: "#FFE03C",
  orange: "#FF9F3C",
  error: "#F31260",
  purple: "#A855F7",
};

export function ForgeOrb({
  size = 96,
  state = "idle",
  intensity = 0,
  glow = true,
  interactive = false,
  className,
  ariaLabel = "Forge",
}: ForgeOrbProps) {
  const reduce = useReducedMotion();
  const ringControls = useAnimationControls();
  const eyeControls = useAnimationControls();
  
  // Eye position state
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeScale, setEyeScale] = useState({ scaleY: 1, scaleX: 1 });
  
  // Dynamic color based on state and intensity
  const getColor = useCallback(() => {
    if (state === "error") return COLORS.error;
    if (state === "success") return COLORS.green;
    if (state === "listening") return COLORS.cyan;
    if (state === "thinking") return COLORS.purple;
    if (state === "loading" && intensity > 0.7) return COLORS.orange;
    if (state === "loading" && intensity > 0.4) return COLORS.yellow;
    return COLORS.green;
  }, [state, intensity]);

  const [currentColor, setCurrentColor] = useState(COLORS.green);

  // Color cycling for loading state with high intensity
  useEffect(() => {
    if (state !== "loading" || reduce) {
      setCurrentColor(getColor());
      return;
    }
    
    if (intensity > 0.5) {
      const colors = [COLORS.green, COLORS.cyan, COLORS.yellow, COLORS.green];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % colors.length;
        setCurrentColor(colors[i]);
      }, 400 - intensity * 200);
      return () => clearInterval(interval);
    } else {
      setCurrentColor(getColor());
    }
  }, [state, intensity, reduce, getColor]);

  // Natural eye movement - looking around curiously
  useEffect(() => {
    if (reduce) return;
    if (state === "loading" || state === "thinking") {
      // When working: eyes dart around more actively
      const targets = [
        { x: 0, y: -2 }, { x: 3, y: -1 }, { x: -2, y: 0 },
        { x: 2, y: 2 }, { x: -3, y: -2 }, { x: 0, y: 1 },
        { x: 4, y: 0 }, { x: -1, y: -3 }, { x: 0, y: 0 },
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % targets.length;
        setEyePos(targets[i]);
      }, 300 + Math.random() * 400);
      return () => clearInterval(interval);
    }
    
    if (state === "happy" || state === "success") {
      setEyePos({ x: 0, y: 2 });
      setEyeScale({ scaleY: 0.4, scaleX: 1.1 }); // Squinted happy eyes
      return;
    }
    
    if (state === "error") {
      // Worried look - eyes together
      setEyeScale({ scaleY: 0.7, scaleX: 0.9 });
      return;
    }
    
    if (state === "listening") {
      // Wide attentive eyes
      setEyeScale({ scaleY: 1.1, scaleX: 1 });
      setEyePos({ x: 0, y: -1 });
      return;
    }
    
    // Idle: calm, natural looking around
    const targets = [
      { x: 0, y: 0 }, { x: -3, y: 0 }, { x: 0, y: 0 },
      { x: 3, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 },
      { x: -2, y: 1 }, { x: 2, y: -1 }, { x: 0, y: 0 },
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % targets.length;
      setEyePos(targets[i]);
    }, 1200 + Math.random() * 1800);
    
    setEyeScale({ scaleY: 1, scaleX: 1 });
    return () => clearInterval(interval);
  }, [state, reduce]);

  // Natural blinking
  useEffect(() => {
    if (reduce || state === "happy" || state === "success") return;
    
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };
    
    // Random blink interval
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      return setTimeout(() => {
        blink();
        timerId = scheduleNextBlink();
      }, delay);
    };
    
    let timerId = scheduleNextBlink();
    return () => clearTimeout(timerId);
  }, [state, reduce]);

  // Thinking state: occasional "focus" squint
  useEffect(() => {
    if (state !== "thinking" || reduce) return;
    
    const focusSquint = () => {
      setEyeScale({ scaleY: 0.5, scaleX: 1 });
      setTimeout(() => setEyeScale({ scaleY: 1, scaleX: 1 }), 400);
    };
    
    const interval = setInterval(focusSquint, 2000 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [state, reduce]);

  // Ring rotation speed based on state
  const getRingAnimation = () => {
    if (reduce) return {};
    
    if (state === "loading") {
      return {
        rotate: 360,
        transition: {
          repeat: Infinity,
          ease: "linear",
          duration: Math.max(0.6, 1.6 - intensity),
        },
      };
    }
    
    if (state === "thinking") {
      return {
        rotate: [0, 10, -10, 0],
        transition: {
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut",
        },
      };
    }
    
    if (state === "error") {
      return {
        scale: [1, 1.05, 1],
        transition: {
          repeat: Infinity,
          duration: 0.5,
        },
      };
    }
    
    if (state === "success") {
      return {
        scale: [1, 1.1, 1],
        transition: {
          duration: 0.6,
          ease: "easeOut",
        },
      };
    }
    
    if (state === "listening") {
      return {
        scale: [1, 1.02, 1],
        transition: {
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
        },
      };
    }
    
    // Idle: subtle breathing
    return {
      scale: [1, 1.01, 1],
      transition: {
        repeat: Infinity,
        duration: 3,
        ease: "easeInOut",
      },
    };
  };

  // Compute final eye scaleY (combine state scale with blink)
  const finalEyeScaleY = isBlinking ? 0.08 : eyeScale.scaleY;
  
  // Glow intensity based on state
  const glowIntensity = state === "loading" ? 1 + intensity * 0.5 : 
                        state === "success" ? 1.3 :
                        state === "error" ? 0.8 : 1;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
      }}
    >
      {/* Outer glow halo */}
      {glow && (
        <motion.span
          aria-hidden
          animate={{
            opacity: [0.35 * glowIntensity, 0.55 * glowIntensity, 0.35 * glowIntensity],
            scale: [1, 1.05, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: state === "loading" ? 1 : 3,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            inset: "-40%",
            background: `radial-gradient(closest-side, ${currentColor}40, transparent 70%)`,
            pointerEvents: "none",
            filter: `blur(${size * 0.1}px)`,
          }}
        />
      )}

      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: glow
            ? `drop-shadow(0 0 ${8 * glowIntensity}px ${currentColor}80) drop-shadow(0 0 ${16 * glowIntensity}px ${currentColor}50)`
            : "none",
        }}
      >
        {/* Orbital ring group */}
        <motion.g
          animate={getRingAnimation()}
          style={{ transformOrigin: "100px 100px" }}
        >
          {/* Main outer ring with gap at top */}
          <motion.path
            d="M 100,20 A 80,80 0 1,1 99.99,20"
            stroke={currentColor}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            animate={{
              strokeWidth: state === "loading" ? [5, 6, 5] : 5,
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
            }}
          />
          
          {/* Inner subtle ring */}
          <circle
            cx="100"
            cy="100"
            r="72"
            stroke={currentColor}
            strokeOpacity="0.35"
            strokeWidth="1.5"
            fill="none"
          />
          
          {/* Secondary inner ring for depth */}
          <circle
            cx="100"
            cy="100"
            r="68"
            stroke={currentColor}
            strokeOpacity="0.15"
            strokeWidth="0.5"
            fill="none"
          />
          
          {/* Tab notch - vertical slit */}
          <motion.rect
            x="98"
            y="8"
            width="4"
            height="16"
            rx="2"
            fill={currentColor}
            animate={{
              opacity: state === "loading" ? [1, 0.6, 1] : 1,
            }}
            transition={{
              repeat: Infinity,
              duration: 0.5,
            }}
          />
          
          {/* Gap mask for notch */}
          <rect x="94" y="18" width="12" height="8" fill="var(--bg, #000)" />
        </motion.g>

        {/* Eyes container */}
        <motion.g
          animate={{
            x: eyePos.x,
            y: eyePos.y,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          style={{ transformOrigin: "100px 100px" }}
        >
          {/* Left eye */}
          <motion.rect
            x="80"
            y="78"
            width="10"
            height="44"
            rx="5"
            fill={currentColor}
            animate={{
              scaleY: finalEyeScaleY,
              scaleX: eyeScale.scaleX,
            }}
            transition={{
              duration: isBlinking ? 0.08 : 0.2,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "85px 100px" }}
          />
          
          {/* Right eye */}
          <motion.rect
            x="110"
            y="78"
            width="10"
            height="44"
            rx="5"
            fill={currentColor}
            animate={{
              scaleY: finalEyeScaleY,
              scaleX: eyeScale.scaleX,
            }}
            transition={{
              duration: isBlinking ? 0.08 : 0.2,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "115px 100px" }}
          />
          
          {/* Eye highlights (small reflection dots) */}
          {state !== "error" && (
            <>
              <motion.circle
                cx="83"
                cy="88"
                r="2"
                fill="white"
                opacity="0.6"
                animate={{
                  opacity: isBlinking ? 0 : 0.6,
                }}
              />
              <motion.circle
                cx="113"
                cy="88"
                r="2"
                fill="white"
                opacity="0.6"
                animate={{
                  opacity: isBlinking ? 0 : 0.6,
                }}
              />
            </>
          )}
        </motion.g>
        
        {/* Center glow when loading at high intensity */}
        {state === "loading" && intensity > 0.5 && (
          <motion.circle
            cx="100"
            cy="100"
            r="30"
            fill={currentColor}
            opacity="0"
            animate={{
              opacity: [0, 0.15, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
            }}
          />
        )}
      </svg>
    </span>
  );
}

// Enhanced demo component
export function ForgeOrbDemo() {
  const [intensity, setIntensity] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIntensity(prev => (prev + 0.1) % 1.1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 p-8 bg-vf-bg">
      <div className="text-center text-vf-fg-2 text-sm font-mono mb-4">ForgeOrb States</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 place-items-center">
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="idle" />
          <span className="text-xs text-vf-fg-2 font-mono">idle</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="listening" />
          <span className="text-xs text-vf-fg-2 font-mono">listening</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="thinking" />
          <span className="text-xs text-vf-fg-2 font-mono">thinking</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="loading" intensity={0.3} />
          <span className="text-xs text-vf-fg-2 font-mono">loading 30%</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="loading" intensity={0.7} />
          <span className="text-xs text-vf-fg-2 font-mono">loading 70%</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="loading" intensity={1} />
          <span className="text-xs text-vf-fg-2 font-mono">loading 100%</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="happy" />
          <span className="text-xs text-vf-fg-2 font-mono">happy</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="success" />
          <span className="text-xs text-vf-fg-2 font-mono">success</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ForgeOrb size={100} state="error" />
          <span className="text-xs text-vf-fg-2 font-mono">error</span>
        </div>
      </div>
      
      <div className="border-t border-vf-border pt-8 mt-8">
        <div className="text-center text-vf-fg-2 text-sm font-mono mb-4">Dynamic Intensity Demo</div>
        <div className="flex justify-center">
          <ForgeOrb size={140} state="loading" intensity={intensity} />
        </div>
        <div className="text-center text-vf-fg-2 text-xs font-mono mt-4">
          Intensity: {Math.round(intensity * 100)}%
        </div>
      </div>
    </div>
  );
}
