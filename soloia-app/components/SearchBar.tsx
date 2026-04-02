"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export function SearchBar({ onSearch, isDisabled, placeholder }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.trim()) {
        onSearch(value.trim());
      }
    }, 400); // Slightly more delay for better UX
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <motion.div
      className="relative w-full"
      animate={{
        boxShadow: isFocused
          ? "0 0 30px rgba(153,69,255,0.1)"
          : "none",
      }}
      style={{ borderRadius: 16 }}
    >
      <div
        className="relative flex items-center overflow-hidden transition-all duration-300"
        style={{
          background: "rgba(13, 21, 37, 0.6)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${isFocused ? "rgba(153,69,255,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 16,
        }}
      >
        {/* Search icon */}
        <div className="pl-4 pr-3 flex-shrink-0">
          <Search 
            size={18} 
            className="transition-colors duration-200"
            style={{ color: isFocused ? "#9945ff" : "rgba(255,255,255,0.2)" }} 
          />
        </div>

        {/* Input */}
        <input
          id="glossary-search"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onSearch(value.trim())}
          placeholder={placeholder || "Search Solana terms... (e.g. PoH, PDA, MEV)"}
          disabled={isDisabled}
          className="flex-1 py-4 pr-4 bg-transparent outline-none font-inter text-sm"
          style={{
            color: "var(--text-primary)",
            caretColor: "#9945ff",
          }}
        />

        {/* Clear button */}
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setValue("")}
            className="px-2 flex-shrink-0 text-white/20 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </motion.button>
        )}

        {/* Keyboard shortcut hint (only when empty and not focused) */}
        {!value && !isFocused && (
          <div className="pr-2 flex-shrink-0">
             <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-jetbrains text-white/20">
               /
             </div>
          </div>
        )}

        {/* ── SOLANA NEON SEARCH BUTTON ────────────────────────── */}
        <motion.button
          onClick={() => value.trim() && onSearch(value.trim())}
          className="btn-solana mr-1.5"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10">BUSCAR</span>
          <motion.div 
            className="absolute inset-0 bg-white/10"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}
