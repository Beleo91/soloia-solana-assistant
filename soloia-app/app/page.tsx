/**
 * SOLOIA — Solana Voice Intelligence
 * Main Application Page
 *
 * Architecture:
 *  - 4 tabs, each a self-contained feature
 *  - Tab 1: 🔮 Voice Orb (webkitSpeechRecognition + @stbr/solana-glossary)
 *  - Tab 2: 🐛 Error Decoder (paste terminal errors)
 *  - Tab 3: 🕵️ Security Detective (Anchor/Rust vulnerability scanner)
 *  - Tab 4: 💉 Context Injector (anti-hallucination prompt builder)
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  Bug, 
  ShieldAlert, 
  FileJson, 
  Globe, 
  Volume2, 
  ExternalLink,
  ChevronRight,
  Info,
  X
} from "lucide-react";

// ── Components ────────────────────────────────────────────────────────────────
import { NeuralOrb } from "@/components/NeuralOrb";
import { TermCard } from "@/components/TermCard";
import { SearchBar } from "@/components/SearchBar";
import { ErrorDecoder } from "@/components/ErrorDecoder";
import { SecurityDetector } from "@/components/SecurityDetector";
import { ContextInjector } from "@/components/ContextInjector";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

// ── Types ─────────────────────────────────────────────────────────────────────
import { GlossaryTerm, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/glossary";
import { ELI5Entry } from "@/lib/eli5";

type OrbState = "idle" | "listening" | "processing" | "result" | "error";
type TabId = "voice" | "decoder" | "detective" | "injector";
type Locale = "en" | "pt";

interface Tab {
  id: TabId;
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  accentColor: string;
  tooltip: string;
  tooltipEn: string;
}

interface TermResult {
  term: GlossaryTerm;
  related: GlossaryTerm[];
  eli5?: ELI5Entry;
}

// ── Tab Config ────────────────────────────────────────────────────────────────
const TABS: Tab[] = [
  {
    id: "voice",
    icon: <Mic size={18} />,
    label: "Orbe de Voz",
    shortLabel: "Voz",
    accentColor: "#9945ff",
    tooltip: "Pesquise termos no Glossário Solana por voz",
    tooltipEn: "Search Solana Glossary terms by voice",
  },
  {
    id: "decoder",
    icon: <Bug size={18} />,
    label: "Decodificador",
    shortLabel: "Erros",
    accentColor: "#ff4757",
    tooltip: "Traduza logs de erro confusos do terminal",
    tooltipEn: "Translate confusing terminal error logs",
  },
  {
    id: "detective",
    icon: <ShieldAlert size={18} />,
    label: "Detetive",
    shortLabel: "Segurança",
    accentColor: "#f7b731",
    tooltip: "Auditoria rápida de segurança para contratos Anchor",
    tooltipEn: "Quick security audit for Anchor contracts",
  },
  {
    id: "injector",
    icon: <FileJson size={18} />,
    label: "Injetor",
    shortLabel: "Contexto",
    accentColor: "#00c3ff",
    tooltip: "Gere contextos blindados para usar no Cursor/Windsurf",
    tooltipEn: "Generate shielded contexts for Cursor/Windsurf",
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SOLOIAPage() {
  // Navigation & Locale
  const [activeTab, setActiveTab] = useState<TabId>("voice");
  const [locale, setLocale] = useState<Locale>("pt");

  // Voice tab state
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [termResult, setTermResult] = useState<TermResult | null>(null);
  const [searchResults, setSearchResults] = useState<Array<GlossaryTerm & { eli5?: ELI5Entry }>>([]);
  const [isMultiResult, setIsMultiResult] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [keyword, setKeyword] = useState("");
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);

  // Global state
  const [totalTerms, setTotalTerms] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/glossary?mode=all&lang=${locale}`)
      .then((r) => r.json())
      .then((d) => setTotalTerms(d.total ?? 0))
      .catch(() => {});
  }, [locale]);

  useEffect(() => {
    if (termResult && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    }
  }, [termResult]);

  // ── Core data function ───────────────────────────────────────────────────
  const fetchTerm = useCallback(async (idOrQuery: string, isId = false): Promise<TermResult | null> => {
    const url = isId
      ? `/api/glossary?id=${idOrQuery}&lang=${locale}`
      : `/api/glossary?mode=voice&q=${encodeURIComponent(idOrQuery)}&lang=${locale}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    if (!isId && data.results?.[0]) {
      const top = data.results[0];
      const full = await fetch(`/api/glossary?id=${top.id}&lang=${locale}`);
      const fullData = await full.json();
      return { term: fullData.term, related: fullData.related ?? [], eli5: fullData.eli5 };
    }

    if (isId && data.term) {
      return { term: data.term, related: data.related ?? [], eli5: data.eli5 };
    }

    return null;
  }, [locale]);

  // ── Voice handlers ───────────────────────────────────────────────────────
  const handleVoiceResult = useCallback(async (spokenText: string) => {
    setTranscript(spokenText);
    setOrbState("processing");
    setTermResult(null);
    setSearchResults([]);
    setIsMultiResult(false);
    setVoiceError("");
    setAutoPlayTTS(true); // Voice searches auto-play TTS

    try {
      const res = await fetch(`/api/glossary?mode=voice&q=${encodeURIComponent(spokenText)}&lang=${locale}`);
      const data = await res.json();
      setKeyword(data.keyword ?? spokenText);

      if (!data.results?.length) {
        throw new Error(locale === 'pt' 
          ? `Nenhum termo encontrado para "${data.keyword}".` 
          : `No term found for "${data.keyword}".`);
      }

      const full = await fetch(`/api/glossary?id=${data.results[0].id}&lang=${locale}`);
      const fullData = await full.json();

      setTermResult({ term: fullData.term, related: fullData.related ?? [], eli5: fullData.eli5 });
      setOrbState("result");
    } catch (err) {
      setOrbState("error");
      setVoiceError(err instanceof Error ? err.message : "Erro ao buscar");
    }
  }, [locale]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setOrbState("processing");
    setTermResult(null);
    setSearchResults([]);
    setIsMultiResult(false);
    setVoiceError("");
    setTranscript("");
    setKeyword("");
    setAutoPlayTTS(false); // Text searches don't auto-play (per instructions)

    try {
      const res = await fetch(`/api/glossary?q=${encodeURIComponent(query)}&lang=${locale}`);
      const data = await res.json();

      if (!data.results?.length) {
        throw new Error(locale === 'pt' ? `Nenhum resultado para "${query}"` : `No results for "${query}"`);
      }

      if (data.results.length === 1) {
        const full = await fetch(`/api/glossary?id=${data.results[0].id}&lang=${locale}`);
        const fullData = await full.json();
        setTermResult({ term: fullData.term, related: fullData.related ?? [], eli5: fullData.eli5 });
        setOrbState("result");
      } else {
        setSearchResults(data.results.slice(0, 8));
        setIsMultiResult(true);
        setOrbState("result");
      }
    } catch (err) {
      setOrbState("error");
      setVoiceError(err instanceof Error ? err.message : "Erro");
    }
  }, [locale]);

  const handleRelatedClick = useCallback(async (termId: string) => {
    setOrbState("processing");
    setIsMultiResult(false);
    setTranscript("");
    setKeyword("");
    setAutoPlayTTS(false);

    try {
      const result = await fetchTerm(termId, true);
      if (!result) throw new Error("Erro");
      setTermResult(result);
      setOrbState("result");
    } catch (err) {
      setOrbState("error");
      setVoiceError(err instanceof Error ? err.message : "Erro");
    }
  }, [fetchTerm]);

  // Handle Context Injector navigation
  const openTermInVoiceTab = useCallback((termId: string) => {
    setActiveTab("voice");
    handleRelatedClick(termId);
  }, [handleRelatedClick]);

  // ── Speech recognition ───────────────────────────────────────────────────
  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition({
      onResult: ({ transcript: t }) => handleVoiceResult(t),
      onError: (err) => { setOrbState("error"); setVoiceError(err); },
      onStart: () => {
        setOrbState("listening");
        setTermResult(null);
        setSearchResults([]);
        setVoiceError("");
        setTranscript("");
        setKeyword("");
      },
      onEnd: () => {
        if (orbState === "listening") setOrbState("idle");
      },
      onAudioLevel: setAudioLevel,
    });

  const handleOrbClick = useCallback(() => {
    if (isListening) {
      stopListening();
      setOrbState("idle");
      return;
    }
    if (!isSupported) {
      setVoiceError(locale === 'pt' ? "Reconhecimento de voz não suportado neste navegador." : "Speech recognition not supported in this browser.");
      setOrbState("error");
      return;
    }
    startListening();
  }, [isListening, isSupported, startListening, stopListening, locale]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (tab !== "voice" && isListening) stopListening();
  }, [isListening, stopListening]);

  const toggleLocale = () => {
    setLocale((prev) => (prev === "pt" ? "en" : "pt"));
    handleClearResults();
  };

  const handleClearResults = useCallback(() => {
    setTermResult(null);
    setSearchResults([]);
    setIsMultiResult(false);
    setOrbState("idle");
    setTranscript("");
    setKeyword("");
    setVoiceError("");
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen bg-[#05080e] overflow-x-hidden font-inter text-white">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#9945ff]/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#14f195]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center pb-20 pt-12">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HEADER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* ── SUPER HEADER CENTRALIZED ────────────────────────── */}
        {/* ── TOP UTILITY ROW (Fixed/Absolute) ────────────────── */}
        <div className="absolute top-6 left-6 right-6 md:top-10 md:left-12 md:right-12 flex justify-between items-start pointer-events-none z-50">
          <div className="pointer-events-auto">
             <a
              href="https://github.com/solanabr/solana-glossary"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 font-jetbrains text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all bg-white/5 border border-white/10 text-white/40 hover:text-white"
            >
              <ExternalLink size={12} />
              SDK Registry
            </a>
          </div>
          <div className="pointer-events-auto">
            <motion.button
              onClick={toggleLocale}
              className="btn-solana shadow-2xl"
              whileTap={{ scale: 0.95 }}
              animate={isListening ? { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Globe size={14} strokeWidth={3} />
              <span>{locale === 'pt' ? 'Português' : 'English'}</span>
            </motion.button>
          </div>
        </div>

        {/* ── CENTRALIZED CONTENT COLUMN ────────────────────────── */}
        <div className="w-full max-w-4xl flex flex-col items-center">
          <motion.header
            className="flex flex-col items-center text-center mb-16 w-full"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >

          {/* Large Central Logo */}
          <motion.div 
            className="group relative mb-8"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#9945ff] to-[#14f195] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-white/10 overflow-hidden shadow-[0_0_50px_rgba(153,69,255,0.2)] bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="SOLOIA Logo" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" />
            </div>
          </motion.div>

          {/* Title Stack */}
          <div className="relative">
            <motion.h1 
              className="font-orbitron font-black text-5xl md:text-7xl tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20"
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "-0.02em", opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              SOLOIA
            </motion.h1>
            <div className="flex flex-col items-center gap-4">
              <p className="font-jetbrains text-[10px] md:text-xs text-white/40 uppercase tracking-[0.5em] font-medium pulse-glow">
                Solana Voice Intelligence
              </p>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
                <span className="font-jetbrains text-[9px] px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/30">
                  SYSTEM VERSION 2.1_STB
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
              </div>
            </div>
          </div>
        </motion.header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATION STATUS (Replacing Hero Title for a cleaner look)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence mode="wait">
        {activeTab === "voice" && (
          <motion.section
            key="status"
            className="flex flex-col items-center gap-1 mt-6 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: orbState === 'listening' ? [1, 1.5, 1] : 1,
                    opacity: orbState === 'listening' ? [1, 0.5, 1] : 1,
                    backgroundColor: orbState === 'listening' ? '#ff4757' : (orbState === 'processing' ? '#f7b731' : '#14f195')
                  }}
                  transition={{ repeat: orbState !== 'idle' ? Infinity : 0, duration: 1 }}
                  className="w-1.5 h-1.5 rounded-full"
                />
                <span className="font-jetbrains text-[10px] uppercase tracking-widest text-muted-foreground">
                  {orbState === 'idle' ? (locale === 'pt' ? 'SOLOIA PRONTA' : 'SOLOIA READY') : 
                   orbState === 'listening' ? (locale === 'pt' ? 'OUVINDO...' : 'LISTENING...') : 
                   (locale === 'pt' ? 'PROCESSANDO...' : 'PROCESSING...')}
                </span>
             </div>
             <p className="font-jetbrains text-[11px] text-white/30 mt-2">
                {locale === 'pt' ? 'Pressione o Orbe para perguntar · Busque por mais de 1000 termos' : 'Press the Orb to ask · Search over 1000 terms'}
             </p>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB NAVIGATION — premium arc style
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.nav
        className="flex items-center gap-2 mb-12 p-1.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl shadow-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className="relative btn-standard transition-all group"
              style={{
                color: isActive ? tab.accentColor : "rgba(255,255,255,0.4)",
                paddingLeft: "1.25rem",
                paddingRight: "1.25rem",
              }}
              whileTap={{ scale: 0.96 }}
            >
              {/* Specialized Tooltip */}
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-2 bg-[#0a0a0a] border border-[#9945ff]/30 rounded-lg text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[100] whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <span className="font-jetbrains tracking-tight">
                  {locale === 'pt' ? tab.tooltip : tab.tooltipEn}
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#9945ff]/30" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#0a0a0a] mt-[-1px]" />
              </div>

              {isActive && (
                <motion.div 
                  layoutId="tab-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ 
                    background: `${tab.accentColor}10`, 
                    border: `1px solid ${tab.accentColor}20`,
                  }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 hidden sm:block tracking-widest">{tab.label}</span>
              <span className="relative z-10 sm:hidden tracking-widest">{tab.shortLabel}</span>
            </motion.button>
          );
        })}
      </motion.nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB CONTENT
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence mode="wait">

        {/* ── TAB 1: ORBE DE VOZ ──────────────────────────────────────────── */}
        {activeTab === "voice" && (
          <motion.div
            key="voice"
            className="flex flex-col items-center w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Neural Orb wrapper with Glow */}
            <div className="relative mb-12">
               <div 
                 className="absolute inset-0 blur-[100px] opacity-20 pointer-events-none"
                 style={{ 
                   background: orbState === 'listening' ? '#ff4757' : (orbState === 'processing' ? '#f7b731' : '#9945ff') 
                 }}
               />
               <NeuralOrb state={orbState} onClick={handleOrbClick} audioLevel={audioLevel} />
            </div>

            {/* Text Search Bar */}
            <div className="w-full max-w-xl px-6 mb-8 group">
              <SearchBar 
                 onSearch={handleSearch} 
                 isDisabled={isListening} 
                 placeholder={locale === 'pt' ? 'Ou digite o termo para buscar no SDK...' : 'Or type a term to search the SDK...'}
              />
            </div>

            {/* Error display */}
            <AnimatePresence>
              {orbState === "error" && voiceError && (
                <motion.div
                  className="mx-6 mb-6 px-4 py-3 rounded-xl max-w-xl w-full flex items-center gap-3"
                  style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)" }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Info size={16} className="text-[#ff4757] flex-shrink-0" />
                  <p className="font-jetbrains text-sm" style={{ color: "#ff4757" }}>
                    {voiceError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result area */}
            <div ref={resultRef} className="w-full max-w-2xl px-6 flex flex-col items-center gap-6 mt-4">
              <AnimatePresence mode="wait">
                {(termResult || isMultiResult) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-center w-full"
                  >
                    <button
                      onClick={handleClearResults}
                      className="btn-outline flex items-center gap-2 text-[10px] uppercase tracking-widest py-1.5 px-4"
                    >
                      <X size={12} />
                      {locale === 'pt' ? 'Limpar Resultados' : 'Clear Results'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {termResult && !isMultiResult && (
                  <TermCard
                    key={termResult.term.id}
                    term={termResult.term}
                    related={termResult.related}
                    eli5={termResult.eli5}
                    transcript={transcript}
                    keyword={keyword !== transcript ? keyword : undefined}
                    onRelatedClick={handleRelatedClick}
                    autoPlayTTS={autoPlayTTS}
                    lang={locale}
                  />
                )}
              </AnimatePresence>

              {/* Multi-result list */}
              <AnimatePresence>
                {isMultiResult && searchResults.length > 0 && (
                  <motion.div className="w-full" initial={{ opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-4 px-2">
                       <span className="w-1 h-3 bg-[#9945ff] rounded-full" />
                       <span className="font-jetbrains text-[10px] uppercase tracking-widest text-muted-foreground">
                        {searchResults.length} {locale === 'pt' ? 'RESULTADOS ENCONTRADOS' : 'RESULTS FOUND'}
                       </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {searchResults.map((term, i) => (
                        <CompactResultRow
                          key={term.id}
                          term={term}
                          index={i}
                          onClick={() => handleRelatedClick(term.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Other tabs handled by sub-components ───────────────────────── */}
        {activeTab === "decoder" && (
          <motion.div key="decoder" className="w-full max-w-3xl px-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorDecoder isActive locale={locale} />
          </motion.div>
        )}

        {activeTab === "detective" && (
          <motion.div key="detective" className="w-full max-w-3xl px-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <SecurityDetector onGlossaryLookup={openTermInVoiceTab} locale={locale} />
          </motion.div>
        )}

        {activeTab === "injector" && (
          <motion.div key="injector" className="w-full max-w-3xl px-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ContextInjector onTermSelect={openTermInVoiceTab} locale={locale} />
          </motion.div>
        )}

      </AnimatePresence>

      <footer className="mt-auto pt-16 flex flex-col items-center">
         <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="font-jetbrains text-[10px] text-white/30 uppercase tracking-[0.2em]">
               Superteam Brazil
            </span>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5 grayscale opacity-50 contrast-125">
               <span className="text-[10px] font-bold text-[#14f195]">Solana</span>
               <span className="text-[10px] font-bold text-[#9945ff]">Glossary</span>
            </div>
         </div>
       </footer>
      </div>
    </div>
  </main>
  );
}

// ── Compact Result Row (for multi-result list) ────────────────────────────────
function CompactResultRow({ term, index, onClick }: { term: GlossaryTerm; index: number; onClick: () => void; }) {
  const color = CATEGORY_COLORS[term.category] ?? "#9945ff";

  return (
    <motion.button
      className="w-full text-left relative overflow-hidden group cursor-pointer rounded-2xl p-4 bg-white/[0.03] border border-white/5 hover:bg-white/[0.05]"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 opacity-40" style={{ background: color }} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-orbitron text-sm font-bold text-white/90">
              {term.term}
            </span>
            <span className="text-[10px] font-jetbrains text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-black/40">
              {CATEGORY_LABELS[term.category]}
            </span>
          </div>
          <p className="font-inter text-xs text-muted-foreground line-clamp-1">
            {term.definition}
          </p>
        </div>
        <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
    </motion.button>
  );
}
