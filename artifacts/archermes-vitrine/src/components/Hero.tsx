import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { NeonButton } from "./NeonButton";

export function Hero() {
  const scrollToMarketplace = () => {
    document.getElementById("marketplace")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt="Deep space futuristic background"
          className="w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border-primary/30 mb-8">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-xs font-display tracking-widest text-primary font-semibold">
              NEXT-GEN ASSET PROTOCOL
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            THE FUTURE OF <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-secondary animate-gradient-x text-glow">
              DIGITAL ASSETS
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-sans">
            Discover, collect, and trade extraordinary synthetic realities and holographic artifacts on the most advanced Web3 marketplace in the sector.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <NeonButton size="lg" onClick={scrollToMarketplace}>
              Explore Marketplace
              <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </NeonButton>
            
            <div className="flex items-center gap-6 text-left border-l border-white/10 pl-6 h-14">
              <div>
                <div className="font-display font-bold text-xl text-foreground">24.5K</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Artifacts</div>
              </div>
              <div>
                <div className="font-display font-bold text-xl text-foreground">12.8M</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Volume (ETH)</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-[1px] h-16 bg-gradient-to-b from-primary/0 via-primary to-primary/0" />
      </div>
    </section>
  );
}
