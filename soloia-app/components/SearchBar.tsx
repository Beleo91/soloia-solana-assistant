"use client";

import { motion, AnimatePresence } from "framer-motion";
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

  const handleManualSearch = () => {
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  const handleClear = () => {
    setValue("");
  };

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <motion.div
        className="relative w-full"
        animate={{
          boxShadow: isFocused
            ? "0 0 30px rgba(153,69,255,0.15)"
            : "none",
        }}
        style={{ borderRadius: 16 }}
      >
        <div
          className="relative flex items-center transition-all duration-300"
          style={{
            background: "rgba(13, 21, 37, 0.7)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${isFocused ? "rgba(153,69,255,0.5)" : "rgba(255,255,255,0.1)"}`,
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
            onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            placeholder={placeholder || "Search Solana terms..."}
            disabled={isDisabled}
            className="flex-1 py-4 pr-4 bg-transparent outline-none font-inter text-sm text-white"
            style={{
              caretColor: "#9945ff",
            }}
          />

          {/* OK / Checkmark button (Tactical confirmation) */}
          {value.trim() && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleManualSearch}
              className="mr-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9945ff]/20 border border-[#9945ff]/40 text-[#14f195] hover:bg-[#9945ff]/30 transition-all font-jetbrains text-[10px] font-bold"
            >
              <span>OK</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#14f195] animate-pulse" />
            </motion.button>
          )}

          {/* Clear button */}
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleClear}
              className="px-4 flex-shrink-0 text-white/40 hover:text-white transition-colors border-l border-white/5"
            >
              <X size={18} />
            </motion.button>
          )}

          {/* Keyboard shortcut hint */}
          {!value && !isFocused && (
            <div className="pr-4 flex-shrink-0">
               <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-jetbrains text-white/20">
                 /
               </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── CENTRALIZED SOLANA BUSCAR BUTTON ────────────────────────── */}
      <div className="relative group flex flex-col items-center">
        <motion.button
          onClick={handleManualSearch}
          disabled={!value.trim() || isDisabled}
          className="btn-solana w-48 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden h-14"
          whileHover={value.trim() ? { scale: 1.05, boxShadow: "0 0 20px rgba(20,241,149,0.4)" } : {}}
          whileTap={value.trim() ? { scale: 0.95 } : {}}
          animate={value.trim() && !isDisabled ? { 
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 0 10px rgba(153,69,255,0.2)",
              "0 0 25px rgba(20,241,149,0.3)",
              "0 0 10px rgba(153,69,255,0.2)"
            ] 
          } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="relative z-10 font-black tracking-[0.2em]">{isDisabled ? 'PROCESSANDO...' : 'BUSCAR'}</span>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
        </motion.button>

        {/* Dynamic Hint for User Guidance */}
        <AnimatePresence>
          {value.trim() && !isDisabled && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full mt-12 flex flex-col items-center gap-1.5"
            >
              <motion.div 
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-[#14f195]"
              >
                <Search size={18} className="rotate-90 drop-shadow-[0_0_8px_rgba(20,241,149,0.5)]" />
              </motion.div>
              <span className="font-jetbrains text-[10px] uppercase tracking-[0.3em] text-[#14f195] font-black whitespace-nowrap drop-shadow-[0_0_10px_rgba(20,241,149,0.3)]">
                Aperte aqui para ver a resposta
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
