import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-violet-500 to-violet-400 text-white hover:opacity-90 shadow-[0_8px_24px_rgba(139,92,246,0.35)]",
        primary: "bg-gradient-to-r from-violet-500 to-violet-400 text-white hover:opacity-90 shadow-[0_8px_24px_rgba(139,92,246,0.35)]",
        secondary: "border border-[var(--border-1)] bg-[var(--surface-1)] text-on-surface hover:bg-white/10 hover:border-[var(--border-2)]",
        outline: "border border-[var(--border-1)] bg-transparent text-on-surface hover:bg-[var(--surface-1)]",
        ghost: "bg-transparent text-on-surface-variant hover:bg-[var(--surface-1)] hover:text-on-surface",
        destructive: "bg-red-500/90 text-white hover:bg-red-500",
        link: "text-violet-300 underline-offset-4 hover:underline",
      },
      size: { default: "h-10 px-4 py-2", sm: "h-8 rounded-lg gap-1.5 px-3", lg: "h-11 rounded-xl px-6", icon: "size-10", "icon-sm": "size-8", "icon-lg": "size-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
