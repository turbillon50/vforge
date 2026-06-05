---
name: framer-motion
description: Animaciones pre-optimizadas para React/Next.js. 6 componentes pre-built, 3 hooks reutilizables. GPU-accelerated, <5 animaciones simultáneas, mobile-first. Estándar de diseño para todos los proyectos Luis Delator.
---
# Framer Motion Skill

## Install
```bash
npm install framer-motion
```

## Componentes pre-built

### 1. FadeInOnScroll
```tsx
"use client"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export function FadeInOnScroll({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  )
}
```

### 2. StaggerContainer
```tsx
"use client"
import { motion } from "framer-motion"

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

export function StaggerContainer({ children, className = "" }: {
  children: React.ReactNode; className?: string
}) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = "" }: {
  children: React.ReactNode; className?: string
}) {
  return <motion.div variants={item} className={className}>{children}</motion.div>
}
```

### 3. PageTransition
```tsx
"use client"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### 4. HoverCard
```tsx
"use client"
import { motion } from "framer-motion"

export function HoverCard({ children, className = "" }: {
  children: React.ReactNode; className?: string
}) {
  return (
    <motion.div className={className}
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}>
      {children}
    </motion.div>
  )
}
```

### 5. SlideIn
```tsx
"use client"
import { motion } from "framer-motion"

export function SlideIn({ children, from = "bottom", className = "" }: {
  children: React.ReactNode; from?: "bottom" | "left" | "right" | "top"; className?: string
}) {
  const dir = { bottom: { y: 40 }, top: { y: -40 }, left: { x: -40 }, right: { x: 40 } }
  return (
    <motion.div className={className}
      initial={{ opacity: 0, ...dir[from] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  )
}
```

### 6. NumberCounter
```tsx
"use client"
import { motion, useSpring, useInView } from "framer-motion"
import { useRef, useEffect } from "react"

export function NumberCounter({ value, prefix = "", suffix = "" }: {
  value: number; prefix?: string; suffix?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const spring = useSpring(0, { stiffness: 60, damping: 20 })
  useEffect(() => { if (inView) spring.set(value) }, [inView, spring, value])
  return (
    <span ref={ref}>
      {prefix}<motion.span>{spring}</motion.span>{suffix}
    </span>
  )
}
```

## Hooks reutilizables

### useScrollAnimation
```tsx
import { useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export function useScrollAnimation() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 0.3], [40, 0])
  return { ref, opacity, y }
}
```

### useMouseParallax
```tsx
import { useMotionValue, useSpring } from "framer-motion"
import { useEffect } from "react"

export function useMouseParallax(strength = 0.02) {
  const x = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 80, damping: 20 })
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      x.set((e.clientX - window.innerWidth / 2) * strength)
      y.set((e.clientY - window.innerHeight / 2) * strength)
    }
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [x, y, strength])
  return { x, y }
}
```

### useInView (custom)
```tsx
import { useInView as useFramerInView } from "framer-motion"
import { useRef } from "react"

export function useInViewAnimation(threshold = 0.1) {
  const ref = useRef(null)
  const inView = useFramerInView(ref, { once: true, amount: threshold })
  return { ref, inView }
}
```

## Reglas de performance
- SIEMPRE usar `transform` y `opacity` (GPU-accelerated)
- NUNCA animar `width`, `height`, `top`, `left` (CPU)
- Máximo 5 animaciones simultáneas en móvil
- `will-change: transform` solo en elementos que realmente lo necesitan
- `once: true` en scroll animations para no re-animar
- Usar `layout` prop de Framer para reordenamientos de lista

## Integración por proyecto
| Proyecto | Uso principal |
|---|---|
| CSN | StaggerContainer en listado de productos, HoverCard en sucursales |
| MT Empresarial | PageTransition entre roles, SlideIn en panels |
| Ruta 618 | NumberCounter en ganancias, FadeInOnScroll en historial |
| RideMe | SlideIn en ofertas de conductor, HoverCard en mapas |
| Castores | StaggerContainer en catálogo, HoverCard en productos |
