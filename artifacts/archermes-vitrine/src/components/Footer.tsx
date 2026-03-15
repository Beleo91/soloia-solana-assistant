import { Hexagon, Twitter, Github, MessageSquare } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background border-t border-white/10 pt-16 pb-8 relative z-10 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 inline-flex">
              <Hexagon className="w-6 h-6 fill-primary/20 stroke-primary" />
              <span className="font-display font-bold text-lg tracking-widest text-glow">ARCHERMES</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              The premier decentralized marketplace for synthetic realities and next-generation holographic assets. Building the visual foundation of the spatial web.
            </p>
            <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                <Twitter className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                <Github className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div>
            <h4 className="font-display font-bold mb-4 tracking-wider text-white">MARKETPLACE</h4>
            <ul className="space-y-3">
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Explore</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Trending</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Collections</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Creators</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-bold mb-4 tracking-wider text-white">RESOURCES</h4>
            <ul className="space-y-3">
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Partners</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Smart Contracts</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Documentation</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ARCHERMES Protocol. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-muted-foreground hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/" className="text-xs text-muted-foreground hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
