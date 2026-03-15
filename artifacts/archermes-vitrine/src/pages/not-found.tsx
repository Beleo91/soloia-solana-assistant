import { Link } from "wouter";
import { Hexagon, AlertTriangle } from "lucide-react";
import { NeonButton } from "@/components/NeonButton";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.1)_0%,transparent_50%)]" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md glass-panel p-12 rounded-3xl">
        <div className="relative mb-8 text-secondary">
          <Hexagon className="w-24 h-24 fill-secondary/10 stroke-secondary animate-[spin_10s_linear_infinite]" strokeWidth={1} />
          <AlertTriangle className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
        </div>
        
        <h1 className="text-6xl font-display font-black text-white mb-2 text-glow-purple">404</h1>
        <h2 className="text-xl font-display text-muted-foreground tracking-widest mb-6">SECTOR NOT FOUND</h2>
        
        <p className="text-sm text-muted-foreground mb-8">
          The spatial coordinates you requested do not exist within the Archermes network. The artifact may have been burned or relocated.
        </p>
        
        <Link href="/">
          <NeonButton variant="primary" className="w-full">
            Return to Core
          </NeonButton>
        </Link>
      </div>
    </div>
  );
}
