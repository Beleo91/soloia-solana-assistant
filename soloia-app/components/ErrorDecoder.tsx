"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef } from "react";
import { 
  Copy, 
  Check, 
  Info, 
  AlertCircle, 
  Zap, 
  Image as ImageIcon, 
  Search, 
  Trash2, 
  Bug, 
  ChevronDown,
  Pause,
  Square,
  Play,
  Upload,
  FileCode,
  ShieldAlert,
  Globe,
  FileJson,
  FileText
} from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { GlossaryTerm, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/glossary";
import { ELI5Entry } from "@/lib/eli5";
import { ELI5Panel } from "./ELI5Panel";

interface DecoderResult {
  term: GlossaryTerm;
  matchedToken: string;
  eli5?: ELI5Entry;
}

interface ErrorDecoderProps {
  isActive: boolean;
  locale?: "en" | "pt";
}

// Common Solana error codes with human-readable explanations
const SOLANA_ERROR_CODES: Record<string, { meaning: string; fix: string }> = {
  "0x1": { meaning: "Instrução inválida — dados malformados", fix: "Verifique a serialização dos argumentos da instrução" },
  "0x10": { meaning: "Índice de instrução fora do intervalo", fix: "Confirme que o índice da instrução está correto" },
  "0x64": { meaning: "Conta não encontrada (Account not found)", fix: "A conta PDA pode não ter sido inicializada ainda" },
  "0x1771": { meaning: "Constraint violated — verificação de conta falhou (Anchor)", fix: "Verifique as constraints #[account(...)] no Anchor" },
  "0xbc4": { meaning: "Erro de custom anchor programa (2996)", fix: "Veja os códigos de erro no IDL do seu programa" },
  "insufficient funds": { meaning: "SOL insuficiente para pagar a taxa ou o rent", fix: "Faça airdrop de SOL no devnet ou adicione saldo" },
  "blockhash not found": { meaning: "O blockhash expirou (~150 slots = ~60 segundos)", fix: "Busque um novo blockhash e reenvie a transação" },
  "simulation failed": { meaning: "A transação falhou na simulação (antes de ser enviada)", fix: "Ative os logs detalhados e verifique cada conta" },
  "already in use": { meaning: "Tentou inicializar uma conta que já existe", fix: "Use init_if_needed ou verifique se o PDA já foi criado" },
  "account owned by wrong program": { meaning: "A conta pertence a um programa diferente do esperado", fix: "Confirme o owner da conta e o program ID correto" },
  "custom program error": { meaning: "Erro definido pelo programa (custom error code)", fix: "Consulte o IDL ou os ErrorCode do programa Anchor" },
};

export function ErrorDecoder({ isActive, locale = "pt" }: ErrorDecoderProps) {
  const [errorText, setErrorText] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<DecoderResult[]>([]);
  const [errorCodes, setErrorCodes] = useState<Array<{ code: string; info: { meaning: string; fix: string } }>>([]);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { speak, pause, resume, stop, isPlaying, isPaused } = useTTS();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect error codes in the text
  function detectErrorCodes(text: string) {
    const found: Array<{ code: string; info: { meaning: string; fix: string } }> = [];
    const lower = text.toLowerCase();
    for (const [code, info] of Object.entries(SOLANA_ERROR_CODES)) {
      if (lower.includes(code.toLowerCase())) {
        found.push({ code, info });
      }
    }
    return found;
  }

  const synthesizeReasoning = (codes: any[], terms: any[]) => {
    if (codes.length === 0 && terms.length === 0) {
      return locale === 'pt' 
        ? "Analisei os logs, mas não identifiquei padrões conhecidos do protocolo Solana. Por favor, forneça mais contexto ou o log bruto."
        : "I analyzed the logs but didn't identify known Solana protocol patterns. Please provide more context or the raw log.";
    }

    const intro = locale === 'pt' 
      ? "Análise forense concluída. Identifiquei anomalias críticas no fluxo da transação."
      : "Forensic analysis complete. I've identified critical anomalies in the transaction flow.";
    
    let mid = "";
    if (codes.length > 0) {
      mid = locale === 'pt'
        ? ` O erro prioritário é "${codes[0].code}", indicando: ${codes[0].info.meaning}.`
        : ` The priority error is "${codes[0].code}", indicating: ${codes[0].info.meaning}.`;
    }

    const tech = terms.length > 0 
      ? (locale === 'pt' 
          ? ` Detectei referências a "${terms[0].term.term}", componente central do ecossistema.`
          : ` I detected references to "${terms[0].term.term}", a core ecosystem component.`)
      : "";

    const conclusion = locale === 'pt'
      ? " Recomendo validar a integridade das contas e o IDL do programa."
      : " I recommend validating account integrity and the program IDL.";

    return intro + mid + tech + conclusion;
  };

  const analyzeError = useCallback(async () => {
    const textToAnalyze = errorText.trim();
    if (!textToAnalyze && !uploadedImage) return;

    setIsAnalyzing(true);
    setHasAnalyzed(false);
    setReasoning("");

    try {
      const codes = detectErrorCodes(textToAnalyze);
      setErrorCodes(codes);

      const res = await fetch(`/api/glossary?mode=error&q=${encodeURIComponent(textToAnalyze)}&lang=${locale}`);
      const data = await res.json();
      const terms = data.results || [];
      setResults(terms);
      
      await new Promise(r => setTimeout(r, 1400));
      
      const reasoningText = synthesizeReasoning(codes, terms);
      setReasoning(reasoningText);
      setHasAnalyzed(true);
      
      // Auto-play the analysis
      speak(reasoningText, locale);
    } catch {
      setResults([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [errorText, uploadedImage, locale, speak]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      if (!errorText) {
        setErrorText(locale === 'pt' 
          ? "// Imagem como referência.\n// Cole o log do terminal para análise completa."
          : "// Image used as reference.\n// Paste the terminal log for full analysis.");
      }
    };
    reader.readAsDataURL(file);
  }

  function clearAll() {
    setErrorText("");
    setUploadedImage(null);
    setImageName("");
    setResults([]);
    setErrorCodes([]);
    setHasAnalyzed(false);
    setExpandedTerm(null);
    setReasoning("");
  }

  if (!isActive) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ff4757]/10 border border-[#ff4757]/20 flex items-center justify-center">
            <Bug className="text-[#ff4757]" size={24} />
          </div>
          <div>
            <h2 className="font-orbitron font-black text-xl tracking-tight" style={{ color: "#ff4757" }}>
              {locale === 'pt' ? 'DECODIFICADOR' : 'DECODER'}
            </h2>
            <p className="font-jetbrains text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
              {locale === 'pt' ? 'Análise Forense de Falhas On-Chain' : 'On-Chain Failure Forensic Analysis'}
            </p>
          </div>
        </div>
        
        {(errorText || uploadedImage) && (
          <motion.button onClick={clearAll} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-[#ff4757] hover:border-[#ff4757]/30 transition-all font-jetbrains text-xs" whileTap={{ scale: 0.95 }}>
            <Trash2 size={14} />
            {locale === 'pt' ? 'LIMPAR' : 'CLEAR'}
          </motion.button>
        )}
      </div>

      {/* Input area */}
      <div className="rounded-3xl p-6 mb-8 bg-black/40 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => { setErrorText(""); setUploadedImage(null); setHasAnalyzed(false); }}
              className="btn-outline h-12 w-12 !px-0"
              whileTap={{ scale: 0.9 }}
              title={locale === 'pt' ? 'Limpar tudo' : 'Clear all'}
            >
              <Trash2 size={18} />
            </motion.button>

            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline flex-1 h-12"
              whileTap={{ scale: 0.98 }}
            >
              <Upload size={16} />
              <span className="font-jetbrains text-[10px] uppercase tracking-widest">{locale === 'pt' ? 'Upload de Print' : 'Upload Screenshot'}</span>
            </motion.button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5">
             <AlertCircle size={12} className="text-white/20" />
             <span className="font-jetbrains text-[9px] text-white/30 uppercase tracking-widest">{locale === 'pt' ? 'AGUARDANDO INPUT' : 'AWAITING INPUT'}</span>
          </div>
        </div>

        {uploadedImage && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 rounded-2xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadedImage} alt="Ref" className="w-full object-contain max-h-48" />
          </motion.div>
        )}

        <textarea
          id="error-input"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          placeholder={locale === 'pt' ? 'Cole o log bruto aqui (Anchor, Transaction simulation failed, etc)...' : 'Paste raw log here (Anchor, Transaction simulation failed, etc)...'}
          className="w-full resize-none outline-none font-jetbrains text-xs leading-relaxed p-4 rounded-2xl bg-black/20 border border-white/5 text-white/70 caret-[#ff4757]"
          rows={7}
        />

        <motion.button
          onClick={analyzeError}
          disabled={(!errorText.trim() && !uploadedImage) || isAnalyzing}
          className={`mt-6 w-full h-[52px] ${(!errorText.trim() && !uploadedImage) ? 'bg-white/5 text-white/20' : 'btn-solana'}`}
          whileTap={{ scale: 0.98 }}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Zap size={14} /></motion.div>
              <span>{locale === 'pt' ? 'SINTETIZANDO...' : 'SYNTHESIZING...'}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
               <Search size={14} />
               <span>{locale === 'pt' ? 'INICIAR ANÁLISE FORENSE' : 'START FORENSIC ANALYSIS'}</span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Analysis Results Display */}
      <AnimatePresence>
        {hasAnalyzed && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
            
            {/* Reasoning / Synthetic Assistant Layer */}
            <div className="relative p-6 rounded-3xl bg-[#ff4757]/5 border border-[#ff4757]/20 overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}><Zap size={80} /></motion.div>
               </div>
               
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ff4757]/20 flex items-center justify-center">
                       <Info size={14} className="text-[#ff4757]" />
                    </div>
                    <span className="font-orbitron font-bold text-[10px] tracking-widest text-[#ff4757] uppercase">
                      {locale === 'pt' ? 'SOLOIA INTELLIGENCE' : 'SOLOIA INTELLIGENCE'}
                    </span>
                  </div>

                  {/* TTS Controls */}
                  <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5">
                    {!isPlaying && !isPaused ? (
                      <button onClick={() => speak(reasoning, locale)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-white/40 hover:text-[#ff4757]"><Play size={12} fill="currentColor" /></button>
                    ) : isPaused ? (
                      <button onClick={resume} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-[#14f195]"><Play size={12} fill="currentColor" /></button>
                    ) : (
                      <button onClick={pause} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-[#f7b731]"><Pause size={12} fill="currentColor" /></button>
                    )}
                    {(isPlaying || isPaused) && (
                      <button onClick={stop} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-white/20 hover:text-[#ff4757]"><Square size={10} fill="currentColor" /></button>
                    )}
                  </div>
               </div>
               <p className="font-inter text-sm leading-relaxed text-white/80 font-light italic">
                 &ldquo;{reasoning}&rdquo;
               </p>
            </div>

            {/* Error Codes Section */}
            {errorCodes.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-2 mb-2">
                   <div className="w-1 h-3 bg-[#f7b731] rounded-full" />
                   <span className="font-jetbrains text-[10px] uppercase tracking-widest text-muted-foreground">
                    {locale === 'pt' ? 'CÓDIGOS DE ERRO' : 'ERROR CODES'}
                   </span>
                </div>
                {errorCodes.map(({ code, info }) => (
                  <motion.div key={code} className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Zap size={14} className="text-[#f7b731]" />
                           <span className="font-orbitron font-black text-sm text-[#f7b731] uppercase">{code}</span>
                        </div>
                        <button onClick={() => handleCopy(`${code}: ${info.meaning}`, code)} className="p-2 rounded-lg hover:bg-white/5 text-white/20 transition-all">
                           {copiedId === code ? <Check size={14} className="text-[#14f195]" /> : <Copy size={14} />}
                        </button>
                     </div>
                     <p className="font-jetbrains text-xs text-white/60">{info.meaning}</p>
                     <div className="p-3 rounded-xl bg-black/40 border border-[#14f195]/20">
                        <p className="font-jetbrains text-[11px] text-[#14f195] font-bold mb-1 uppercase tracking-tighter">SUGESTÃO DE CORREÇÃO:</p>
                        <p className="font-jetbrains text-[11px] text-white/50">{info.fix}</p>
                     </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Glossary Matches */}
            {results.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-2 mb-2">
                   <div className="w-1 h-3 bg-[#9945ff] rounded-full" />
                   <span className="font-jetbrains text-[10px] uppercase tracking-widest text-muted-foreground">
                     {locale === 'pt' ? 'TERMOS TÉCNICOS GLOSSÁRIO' : 'GLOSSARY TECHNICAL TERMS'}
                   </span>
                </div>
                {results.map(({ term, matchedToken, eli5 }, i) => {
                  const color = CATEGORY_COLORS[term.category] || "#9945ff";
                  const isExpanded = expandedTerm === term.id;

                  return (
                    <motion.div key={term.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                      <button onClick={() => setExpandedTerm(isExpanded ? null : term.id)} className="w-full text-left p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                           <div>
                              <span className="font-orbitron text-sm font-bold text-white/90">{term.term}</span>
                              <span className="ml-3 text-[10px] font-jetbrains text-white/20 uppercase tracking-widest">{CATEGORY_LABELS[term.category]}</span>
                           </div>
                        </div>
                        <ChevronDown size={18} className={`text-white/10 group-hover:text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-5 border-t border-white/5 pt-4">
                              <div className="flex items-center gap-2 mb-3">
                                 <div className="px-2 py-0.5 rounded bg-[#ff4757]/10 border border-[#ff4757]/20 text-[#ff4757] font-jetbrains text-[10px] uppercase">
                                   Match: {matchedToken}
                                 </div>
                              </div>
                              <p className="font-inter text-xs leading-relaxed text-white/50 mb-5 italic">&ldquo;{term.definition}&rdquo;</p>
                              {eli5 && <ELI5Panel eli5={eli5} termName={term.term} />}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
