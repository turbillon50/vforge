"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useAnimationControls,
  type Transition,
} from "framer-motion";
import { cn } from "@/lib/utils";

type ForgeOrbProps = {
  size?: number;
  state?: "idle" | "loading" | "happy" | "error";
  mood?: "neutral" | "happy" | "concerned";
  glow?: boolean;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
};

const EASE_SMOOTH: Transition["ease"] = [0.4, 0, 0.2, 1];

// Arc path helper for the ring with gap
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

export function ForgeOrb({
  size = 96,
  state = "idle",
  mood = "neutral",
  glow = true,
  interactive = false,
  className,
  ariaLabel = "Forge",
}: ForgeOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const eyeControls = useAnimationControls();
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lookTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Motion values for interactive cursor following
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 120, damping: 20 };
  const eyeX = useSpring(mouseX, springConfig);
  const eyeY = useSpring(mouseY, springConfig);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Blink animation
  const blink = useCallback(async () => {
    if (prefersReducedMotion) {
      await eyeControls.start({
        scaleY: 0.08,
        transition: { duration: 0.15, ease: "easeInOut" },
      });
      await eyeControls.start({
        scaleY: 1,
        transition: { duration: 0.15, ease: "easeInOut" },
      });
    } else {
      await eyeControls.start({
        scaleY: 0.08,
        transition: { duration: 0.09, ease: "easeInOut" },
      });
      await eyeControls.start({
        scaleY: 1,
        transition: { duration: 0.09, ease: "easeInOut" },
      });
    }
  }, [eyeControls, prefersReducedMotion]);

  // Schedule next blink
  const scheduleBlink = useCallback(() => {
    const delay = prefersReducedMotion
      ? 4000
      : 4000 + Math.random() * 3000; // 4-7s
    blinkTimeoutRef.current = setTimeout(() => {
      blink().then(scheduleBlink);
    }, delay);
  }, [blink, prefersReducedMotion]);

  // Look around animation sequence
  const lookAround = useCallback(async () => {
    if (prefersReducedMotion || interactive) return;

    const positions = [
      { x: 0, y: 0, hold: 2000 },
      { x: -4, y: 0, hold: 1200 },
      { x: 0, y: 0, hold: 1600 },
      { x: 4, y: 0, hold: 1400 },
      { x: 0, y: 3, hold: 1000 },
      { x: 0, y: -3, hold: 1200 },
    ];

    for (const pos of positions) {
      await eyeControls.start({
        x: pos.x,
        y: pos.y,
        transition: { duration: 0.25, ease: EASE_SMOOTH },
      });
      await new Promise((resolve) => setTimeout(resolve, pos.hold));
    }
  }, [eyeControls, prefersReducedMotion, interactive]);

  // Schedule look around loop
  const scheduleLookAround = useCallback(() => {
    const delay = 1500 + Math.random() * 2500; // 1.5-4s between sequences
    lookTimeoutRef.current = setTimeout(() => {
      lookAround().then(scheduleLookAround);
    }, delay);
  }, [lookAround]);

  // Start animations
  useEffect(() => {
    if (state === "idle" || state === "loading") {
      scheduleBlink();
      if (!interactive && !prefersReducedMotion) {
        scheduleLookAround();
      }
    }

    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      if (lookTimeoutRef.current) clearTimeout(lookTimeoutRef.current);
    };
  }, [state, scheduleBlink, scheduleLookAround, interactive, prefersReducedMotion]);

  // Interactive cursor following
  useEffect(() => {
    if (!interactive || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );

      if (distance < 200) {
        const maxOffset = 6;
        const offsetX = ((e.clientX - centerX) / 200) * maxOffset;
        const offsetY = ((e.clientY - centerY) / 200) * maxOffset;
        mouseX.set(offsetX);
        mouseY.set(offsetY);
      }
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [interactive, prefersReducedMotion, mouseX, mouseY]);

  // Determine eye expression based on mood/state
  const getEyeTransform = () => {
    if (state === "happy" || mood === "happy") {
      return { scaleY: 0.5, y: 2 };
    }
    if (state === "error" || mood === "concerned") {
      return { scaleY: 0.7, y: 0 };
    }
    return { scaleY: 1, y: 0 };
  };

  const eyeTransform = getEyeTransform();
  const isError = state === "error";
  const strokeColor = isError ? "var(--error)" : "var(--green)";
  const glowColor = isError ? "rgba(243, 18, 96, 0.35)" : "var(--green-glow)";

  // Outer ring arcs (with gap at top from ~85° to ~95°)
  const outerArc1 = describeArc(100, 100, 80, 95, 360 + 85); // Main arc

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Background glow halo */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
            width: "200%",
            height: "200%",
            left: "-50%",
            top: "-50%",
            opacity: 0.18,
          }}
        />
      )}

      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={ariaLabel}
        style={{
          filter: `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 22px ${glowColor})`,
        }}
        animate={
          state === "error" && !prefersReducedMotion
            ? {
                scale: [1, 1.05, 1],
              }
            : {}
        }
        transition={
          state === "error"
            ? {
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {}
        }
      >
        <defs>
          {/* Glow filter */}
          <filter id="forge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring group - rotates when loading */}
        <motion.g
          filter="url(#forge-glow)"
          animate={
            state === "loading" && !prefersReducedMotion
              ? { rotate: 360 }
              : { rotate: 0 }
          }
          transition={
            state === "loading"
              ? {
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "linear",
                }
              : {}
          }
          style={{ transformOrigin: "100px 100px" }}
        >
          {/* Inner subtle ring */}
          <circle
            cx={100}
            cy={100}
            r={72}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1}
            opacity={0.5}
          />

          {/* Outer ring with gap */}
          <path
            d={outerArc1}
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
          />

          {/* Tab notch - vertical slit above the gap */}
          <rect
            x={99}
            y={12}
            width={2}
            height={10}
            fill={strokeColor}
            rx={1}
          />
        </motion.g>

        {/* Eyes group */}
        <motion.g
          className="eyes"
          filter="url(#forge-glow)"
          animate={eyeControls}
          initial={{ scaleY: 1, x: 0, y: 0 }}
          style={{
            transformOrigin: "100px 100px",
            x: interactive ? eyeX : undefined,
            y: interactive ? eyeY : undefined,
          }}
        >
          <motion.g
            style={{ transformOrigin: "100px 100px" }}
            animate={{
              scaleY: eyeTransform.scaleY,
              y: eyeTransform.y,
            }}
            transition={{ duration: 0.3, ease: EASE_SMOOTH }}
          >
            {/* Left eye capsule */}
            <rect
              x={82}
              y={80}
              width={8}
              height={40}
              rx={4}
              fill={strokeColor}
            />
            {/* Right eye capsule */}
            <rect
              x={110}
              y={80}
              width={8}
              height={40}
              rx={4}
              fill={strokeColor}
            />
          </motion.g>
        </motion.g>
      </motion.svg>
    </div>
  );
}

// Demo export for preview
export function ForgeOrbDemo() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-12 bg-vf-bg">
      <div className="flex flex-col items-center gap-3">
        <ForgeOrb size={120} />
        <span className="text-vf-fg-2 text-xs font-mono">idle</span>
      </div>
      <div className="flex flex-col items-center gap-3">
        <ForgeOrb size={120} state="loading" />
        <span className="text-vf-fg-2 text-xs font-mono">loading</span>
      </div>
      <div className="flex flex-col items-center gap-3">
        <ForgeOrb size={120} state="happy" />
        <span className="text-vf-fg-2 text-xs font-mono">happy</span>
      </div>
      <div className="flex flex-col items-center gap-3">
        <ForgeOrb size={120} state="error" />
        <span className="text-vf-fg-2 text-xs font-mono">error</span>
      </div>
    </div>
  );
}

export default ForgeOrb;
