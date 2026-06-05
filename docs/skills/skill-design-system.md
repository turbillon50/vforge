---
name: design-system
description: 7 componentes UI pre-built + design tokens JSON. WCAG 2.1 AA, dark mode, mobile-first, integrado con Framer Motion. Estándar de diseño para todos los proyectos Luis Delator. Sin depender de librerías genéricas.
---
# Design System — Máquina de Diseño

## Design Tokens (globals.css)
```css
:root {
  /* Colors */
  --color-primary:    #2563eb;
  --color-primary-h:  #1d4ed8;
  --color-secondary:  #7c3aed;
  --color-accent:     #06b6d4;
  --color-success:    #16a34a;
  --color-warning:    #d97706;
  --color-danger:     #dc2626;
  --color-surface:    #ffffff;
  --color-bg:         #f8fafc;
  --color-text:       #0f172a;
  --color-text-muted: #64748b;
  --color-border:     #e2e8f0;

  /* Spacing (4px base) */
  --space-xs:  4px;   --space-sm:  8px;
  --space-md:  16px;  --space-lg:  24px;
  --space-xl:  32px;  --space-2xl: 48px;
  --space-3xl: 64px;  --space-4xl: 96px;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --text-xs:   0.75rem;  --text-sm: 0.875rem;
  --text-md:   1rem;     --text-lg: 1.125rem;
  --text-xl:   1.25rem;  --text-2xl: 1.5rem;
  --text-3xl:  1.875rem; --text-4xl: 2.25rem;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / .05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);

  /* Radius */
  --radius-sm: 4px;  --radius-md: 8px;
  --radius-lg: 12px; --radius-xl: 16px; --radius-full: 9999px;

  /* Transitions */
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-fast: 150ms; --duration-base: 250ms; --duration-slow: 400ms;
}

.dark {
  --color-surface: #1e293b;
  --color-bg:      #0f172a;
  --color-text:    #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-border:  #334155;
}
```

## Componentes

### Button
```tsx
"use client"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  className?: string
}

const styles = {
  base: "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  variant: {
    primary:   "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-h)] focus-visible:ring-[var(--color-primary)]",
    secondary: "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]",
    ghost:     "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]",
    danger:    "bg-[var(--color-danger)] text-white hover:bg-red-700",
  },
  size: {
    sm: "h-8  px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  }
}

export function Button({ variant = "primary", size = "md", loading, disabled, children, onClick, type = "button", className = "" }: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className={`${styles.base} ${styles.variant[variant]} ${styles.size[size]} ${className}`}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  )
}
```

### Card
```tsx
"use client"
import { motion } from "framer-motion"

export function Card({ children, hover = false, className = "", onClick }: {
  children: React.ReactNode; hover?: boolean; className?: string; onClick?: () => void
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -2, boxShadow: "var(--shadow-lg)" } : undefined}
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-[var(--shadow-sm)] ${hover ? "cursor-pointer" : ""} ${className}`}>
      {children}
    </motion.div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-[var(--text-lg)] font-semibold text-[var(--color-text)]">{title}</h3>
        {subtitle && <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
```

### Input
```tsx
"use client"
import { forwardRef } from "react"

type InputProps = {
  label?: string; error?: string; hint?: string
  icon?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{icon}</span>}
        <input
          ref={ref}
          className={`w-full h-10 rounded-lg border bg-[var(--color-surface)] text-[var(--color-text)] px-3 text-sm transition-colors
            placeholder:text-[var(--color-text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            ${error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}
            ${icon ? "pl-10" : ""}
            ${className}`}
          {...props} />
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  )
)
Input.displayName = "Input"
```

### Modal
```tsx
"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useEffect } from "react"

export function Modal({ open, onClose, title, children, size = "md" }: {
  open: boolean; onClose: () => void; title: string
  children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"
}) {
  const maxW = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-xl)] w-full ${maxW[size]} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

### Badge
```tsx
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info"
const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]",
  success: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  danger:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  info:    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
}
export function Badge({ children, variant = "default", className = "" }: {
  children: React.ReactNode; variant?: BadgeVariant; className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
```

### Spinner
```tsx
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }
  return (
    <div className={`${s[size]} animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)] ${className}`} />
  )
}
```

### Alert
```tsx
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react"

type AlertType = "success" | "warning" | "error" | "info"
const alertConfig: Record<AlertType, { icon: any; styles: string }> = {
  success: { icon: CheckCircle, styles: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200" },
  warning: { icon: AlertTriangle, styles: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200" },
  error:   { icon: XCircle,       styles: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200" },
  info:    { icon: Info,          styles: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200" },
}
export function Alert({ type = "info", title, message, onClose }: {
  type?: AlertType; title?: string; message: string; onClose?: () => void
}) {
  const { icon: Icon, styles } = alertConfig[type]
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${styles}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onClose && <button onClick={onClose} className="shrink-0"><X className="w-4 h-4" /></button>}
    </div>
  )
}
```

## Uso estándar
```tsx
// Barrel export: components/ui/index.ts
export { Button } from "./button"
export { Card, CardHeader } from "./card"
export { Input } from "./input"
export { Modal } from "./modal"
export { Badge } from "./badge"
export { Spinner } from "./spinner"
export { Alert } from "./alert"
```

## UX Rules
- Spacing: múltiplos de 4px SIEMPRE
- Contraste mínimo: 4.5:1 (WCAG AA)
- Touch targets: mínimo 44x44px en móvil
- Animaciones: 150-400ms, ease-out
- Max 3 colores principales por pantalla
- Breakpoints: sm:640 md:768 lg:1024 xl:1280
