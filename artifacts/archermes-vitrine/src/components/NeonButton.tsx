import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function NeonButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: NeonButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center font-display font-bold uppercase tracking-wider overflow-hidden rounded-lg transition-all duration-300 active:scale-95";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] border border-primary hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:shadow-[0_0_20px_hsl(var(--secondary)/0.6)] border border-secondary hover:bg-secondary/90",
    outline: "bg-transparent text-primary border border-primary/50 hover:border-primary hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:bg-primary/10",
    ghost: "bg-transparent text-foreground hover:text-primary hover:bg-primary/10",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-14 px-8 text-base",
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {variant !== "ghost" && (
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] hover:animate-[shimmer_1.5s_infinite]" />
      )}
    </motion.button>
  );
}
