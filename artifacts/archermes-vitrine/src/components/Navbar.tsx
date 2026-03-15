import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Wallet, LogOut, Menu, X, Hexagon } from "lucide-react";
import { NeonButton } from "./NeonButton";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const connectWallet = () => {
    // Simulate wallet connection
    setTimeout(() => {
      setWallet("0x1A2B890F3C4D");
    }, 500);
  };

  const disconnectWallet = () => {
    setWallet(null);
  };

  const navLinks = [
    { name: "Marketplace", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: "Activity", path: "/activity" },
    { name: "About", path: "/about" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "glass-panel py-3" : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
              className="text-primary"
            >
              <Hexagon className="w-8 h-8 fill-primary/20 stroke-primary" strokeWidth={1.5} />
            </motion.div>
            <span className="font-display font-bold text-xl tracking-widest text-glow hidden sm:block">
              ARCHERMES
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className={cn(
                  "font-display text-sm tracking-wide transition-colors hover:text-primary",
                  location === link.path ? "text-primary text-glow" : "text-muted-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Wallet Actions */}
          <div className="hidden md:flex items-center gap-4">
            {wallet ? (
              <div className="flex items-center gap-3 bg-secondary/10 border border-secondary/30 rounded-lg p-1 pr-4">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_10px_hsl(var(--secondary)/0.5)]">
                  <span className="font-display text-xs font-bold text-white">0x</span>
                </div>
                <span className="font-mono text-sm text-secondary-foreground">
                  {wallet.slice(0, 6)}...{wallet.slice(-4)}
                </span>
                <button
                  onClick={disconnectWallet}
                  className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Disconnect"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NeonButton onClick={connectWallet} variant="primary">
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </NeonButton>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-foreground hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 w-full glass-panel border-t-0 p-4 flex flex-col gap-4 md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              className="font-display text-lg tracking-wide p-3 rounded-md hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-white/10 mt-2">
            {wallet ? (
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="font-mono text-sm text-primary">{wallet}</span>
                <button onClick={disconnectWallet} className="text-destructive">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <NeonButton onClick={connectWallet} className="w-full">
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </NeonButton>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}
