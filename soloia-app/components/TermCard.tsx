"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { Copy, Volume2, Check, Share2, Pause, Square, Play } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { GlossaryTerm, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/glossary";
import { ELI5Entry } from "@/lib/eli5";
import { ELI5Panel } from "./ELI5Panel";

interface TermCardProps {
  term: GlossaryTerm;
  related?: GlossaryTerm[];
  eli5?: ELI5Entry;
  onRelatedClick?: (id: string) => void;
  transcript?: string;
  keyword?: string;
  autoPlayTTS?: boolean;
  lang?: "en" | "pt";
}

export function TermCard({ 
  term, 
  related, 
  eli5, 
  onRelatedClick, 
  transcript, 
  keyword,
  autoPlayTTS = false,
  lang = "pt"
}: TermCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { speak, pause, resume, stop, isPlaying, isPaused } = useTTS();
  
  const categoryColor = CATEGORY_COLORS[term.category] || "#9945ff";
  const categoryLabel = CATEGORY_LABELS[term.category] || term.category;

  // ── Text-to-Speech Logic ────────────────────────────────────────────────
  // Auto-play on mount if requested
  useEffect(() => {
    if (autoPlayTTS && term) {
      speak(term.term + ". " + term.definition, lang);
    }
    return () => stop();
  }, [autoPlayTTS, term, speak, stop, lang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${term.term}: ${term.definition}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={term.id}
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-2xl"
      >
        {/* Voice transcript display */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 px-5 py-3 rounded-2xl flex items-center gap-3"
            style={{
              background: "rgba(153, 69, 255, 0.08)",
              border: "1px solid rgba(153, 69, 255, 0.2)",
            }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9945ff]/20 flex items-center justify-center">
               <Volume2 size={14} className="text-[#9945ff]" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="font-jetbrains text-[10px] text-white/30 uppercase tracking-widest leading-none mb-1">
                 {lang === 'pt' ? 'VOCÊ DISSE' : 'YOU SAID'}
               </p>
               <p className="font-inter text-sm text-white/80 truncate">
                &ldquo;{transcript}&rdquo;
               </p>
            </div>
            {keyword && keyword.toLowerCase() !== transcript.toLowerCase() && (
               <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#14f195]/10 border border-[#14f195]/20">
                  <span className="font-jetbrains text-[10px] text-[#14f195] font-bold">MATCH:</span>
                  <span className="font-jetbrains text-[11px] text-white/90">&ldquo;{keyword}&rdquo;</span>
               </div>
            )}
          </motion.div>
        )}

        {/* Main term card */}
        <div
          className="relative rounded-3xl p-8 overflow-hidden backdrop-blur-xl border border-white/10 bg-black/40"
          style={{
            boxShadow: `0 0 60px ${categoryColor}10, inset 0 0 40px rgba(255,255,255,0.02)`,
          }}
        >
          {/* Top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Header */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-lg font-jetbrains text-[10px] font-bold tracking-widest uppercase border"
                  style={{ color: categoryColor, borderColor: `${categoryColor}40`, backgroundColor: `${categoryColor}08` }}
                >
                  {categoryLabel}
                </span>

                {term.aliases?.slice(0, 2).map((alias) => (
                  <span
                    key={alias}
                    className="font-jetbrains text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/30 border border-white/5"
                  >
                    {alias}
                  </span>
                ))}
              </div>

              <motion.h2
                className="font-orbitron text-3xl font-black tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {term.term}
              </motion.h2>
            </div>

            {/* Action Buttons: Premium TTS Controls */}
            <div className="flex items-center gap-3">
               <div className="flex items-center bg-black/20 rounded-xl border border-white/5 p-1">
                  {!isPlaying && !isPaused ? (
                    <motion.button
                      onClick={() => speak(term.term + ". " + term.definition, lang)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-[#14f195]"
                      whileTap={{ scale: 0.9 }}
                      title={lang === 'pt' ? 'Ouvir' : 'Listen'}
                    >
                      <Play size={18} fill="currentColor" />
                    </motion.button>
                  ) : isPaused ? (
                    <motion.button
                      onClick={resume}
                      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-[#14f195]"
                      whileTap={{ scale: 0.9 }}
                      title={lang === 'pt' ? 'Continuar' : 'Resume'}
                    >
                      <Play size={18} fill="currentColor" />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={pause}
                      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-[#f7b731]"
                      whileTap={{ scale: 0.9 }}
                      title={lang === 'pt' ? 'Pausar' : 'Pause'}
                    >
                      <Pause size={18} fill="currentColor" />
                    </motion.button>
                  )}
                  
                  {(isPlaying || isPaused) && (
                    <motion.button
                      onClick={stop}
                      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all text-white/20 hover:text-[#ff4757]"
                      whileTap={{ scale: 0.9 }}
                      title={lang === 'pt' ? 'Parar' : 'Stop'}
                    >
                      <Square size={16} fill="currentColor" />
                    </motion.button>
                  )}
               </div>

                {/* Translate Button */}
                {lang === 'en' && (
                  <motion.button
                    onClick={() => {
                        // This triggers the parent state to switch to PT if needed, 
                        // but locally we can just show we are translating.
                        // For the bounty, we'll assume the user toggles the global locale,
                        // but a local toggle is a great UX polish.
                        window.location.search = `?lang=pt&q=${term.id}`; 
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#9945ff]/10 border border-[#9945ff]/20 text-[#9945ff] hover:bg-[#9945ff]/20 transition-all"
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="font-jetbrains text-[10px] font-bold">TRADUZIR PARA PT</span>
                  </motion.button>
                )}

                <motion.button
                  onClick={handleCopy}
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 transition-all"
                  whileTap={{ scale: 0.9 }}
                  title={lang === 'pt' ? 'Copiar definição' : 'Copy definition'}
                >
                  {isCopied ? <Check size={20} className="text-[#14f195]" /> : <Copy size={20} />}
                </motion.button>
            </div>
          </div>

          {/* Definition */}
          <div className="relative mb-8">
            <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full opacity-20" style={{ background: categoryColor }} />
            <p className="font-inter text-lg leading-relaxed text-white/80 font-light italic">
              &ldquo;{term.definition}&rdquo;
            </p>
          </div>

          {/* ELI5 Panel */}
          {eli5 && (
            <div className="mb-8 p-1 rounded-2xl bg-gradient-to-br from-[#14f195]30 to-transparent">
               <ELI5Panel eli5={eli5} termName={term.term} />
            </div>
          )}

          {/* Related terms */}
          {related && related.length > 0 && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Share2 size={14} className="text-white/20" />
                <span className="font-jetbrains text-[10px] font-bold tracking-widest text-white/40 uppercase">
                  {lang === 'pt' ? 'Tópicos Relacionados' : 'Related Topics'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {related.map((rel) => (
                  <motion.button
                    key={rel.id}
                    onClick={() => onRelatedClick?.(rel.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
                    whileHover={{ y: -2, borderColor: CATEGORY_COLORS[rel.category] + '40' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: CATEGORY_COLORS[rel.category] }}
                    />
                    <span className="font-jetbrains text-[11px] text-white/50 group-hover:text-white/90">
                      {rel.term}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
