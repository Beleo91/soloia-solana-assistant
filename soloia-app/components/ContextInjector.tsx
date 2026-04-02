"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { Copy, Check, FileJson, Search, ExternalLink, Brain, Code, ShieldCheck, ChevronRight } from "lucide-react";
import { GlossaryTerm, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/glossary";
import { ELI5Entry } from "@/lib/eli5";

interface ContextInjectorProps {
  onTermSelect?: (termId: string) => void;
  locale?: "en" | "pt";
}

interface SearchResult {
  term: GlossaryTerm;
  eli5?: ELI5Entry;
}

/**
 * Generates a structured prompt optimized for AI IDEs like Cursor/Windsurf
 */
function buildContextPrompt(term: GlossaryTerm, eli5?: ELI5Entry, locale: "en" | "pt" = "pt"): string {
  const isPt = locale === "pt";
  const lines: string[] = [
    `# SOLOIA — ${isPt ? 'Contexto Oficial Solana' : 'Official Solana Context'}: ${term.term}`,
    `# Source: @stbr/solana-glossary (Superteam Brazil)`,
    `# ${isPt ? 'Cole este bloco no início do seu chat (Cursor, Windsurf, Copilot)' : 'Paste this block at the start of your AI chat'}`,
    ``,
    `## ${isPt ? 'Definição Técnica' : 'Technical Definition'}`,
    ``,
    `${isPt ? 'Termo' : 'Term'}: ${term.term}`,
    term.aliases && term.aliases.length > 0 ? `Aliases: ${term.aliases.join(", ")}` : "",
    `${isPt ? 'Categoria' : 'Category'}: ${CATEGORY_LABELS[term.category]}`,
    ``,
    term.definition,
  ].filter(Boolean);

  if (eli5) {
    lines.push(
      ``,
      `## ${isPt ? 'Analogia (ELI5)' : 'Analogy (ELI5)'}`,
      ``,
      eli5.analogy
    );

    if (eli5.snippet) {
      lines.push(
        ``,
        `## ${isPt ? 'Exemplo Prático' : 'Practical Example'} (${eli5.snippetLang?.toUpperCase() ?? "Rust"})`,
        ``,
        "```" + (eli5.snippetLang ?? "rust"),
        eli5.snippet,
        "```"
      );
    }
  }

  lines.push(
    ``,
    `## ${isPt ? 'Diretriz Anti-Alucinação' : 'Anti-Hallucination Directive'}`,
    ``,
    isPt 
      ? `Use a definição acima como "Verdade Absoluta" (Ground Truth). Não invente conceitos técnicos.`
      : `Use the definition above as Ground Truth. Do not hallucinate technical concepts.`
  );

  return lines.join("\n");
}

export function ContextInjector({ onTermSelect, locale = "pt" }: ContextInjectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setSelected(null);
    setSearchDone(false);
    setCopied(false);

    try {
      const res = await fetch(`/api/glossary?q=${encodeURIComponent(q)}&lang=${locale}`);
      const data = await res.json();
      const list: SearchResult[] = (data.results ?? []).slice(0, 6).map(
        (t: GlossaryTerm & { eli5?: ELI5Entry }) => ({
          term: t,
          eli5: t.eli5,
        })
      );
      setResults(list);
      setSearchDone(true);
      if (list.length === 1) setSelected(list[0]);
    } catch {
      setResults([]);
      setSearchDone(true);
    } finally {
      setIsSearching(false);
    }
  }, [locale]);

  async function selectResult(r: SearchResult) {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/glossary?id=${r.term.id}&lang=${locale}`);
      const data = await res.json();
      setSelected({
        term: data.term ?? r.term,
        eli5: data.eli5 ?? r.eli5,
      });
    } catch {
      setSelected(r);
    } finally {
      setIsSearching(false);
    }
  }

  async function copyContext() {
    if (!selected) return;
    const prompt = buildContextPrompt(selected.term, selected.eli5, locale);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#00c3ff]/10 border border-[#00c3ff]/20 flex items-center justify-center">
          <FileJson className="text-[#00c3ff]" size={24} />
        </div>
        <div>
          <h2 className="font-orbitron font-black text-xl tracking-tight" style={{ color: "#00c3ff" }}>
            {locale === 'pt' ? 'INJETOR DE CONTEXTO' : 'CONTEXT INJECTOR'}
          </h2>
          <p className="font-jetbrains text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
            {locale === 'pt' ? 'Prompt Engineering Anti-Alucinação' : 'Anti-Hallucination Prompt Engineering'}
          </p>
        </div>
      </div>

      {/* Search Interface */}
      <div className="relative group mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-white/20 group-focus-within:text-[#00c3ff] transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
          placeholder={locale === 'pt' ? 'Busque termos para injetar (ex: PDA, CPI, Rent)...' : 'Search terms to inject (ex: PDA, CPI, Rent)...'}
          className="w-full bg-black/40 border border-white/10 focus:border-[#00c3ff]/40 focus:ring-4 focus:ring-[#00c3ff]/5 rounded-2xl py-4 pl-12 pr-4 outline-none font-inter text-sm transition-all"
        />
        <motion.button
          onClick={() => doSearch(query)}
          disabled={!query.trim() || isSearching}
          className={`absolute right-3 top-2.5 h-10 px-4 rounded-xl font-jetbrains text-[10px] font-black tracking-widest transition-all ${query.trim() ? 'bg-[#00c3ff]/20 text-[#00c3ff] border border-[#00c3ff]/30 hover:bg-[#00c3ff]/30' : 'bg-white/5 text-white/20 border border-white/10'}`}
          whileTap={{ scale: 0.95 }}
        >
          {isSearching ? '...' : (locale === 'pt' ? 'BUSCAR' : 'SEARCH')}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {/* Results Selection */}
        {searchDone && !selected && results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-2 px-2">
               <span className="w-1 h-3 bg-[#00c3ff] rounded-full" />
               <span className="font-jetbrains text-[10px] uppercase tracking-widest text-muted-foreground">
                 {results.length} {locale === 'pt' ? 'TERMOS ENCONTRADOS' : 'TERMS FOUND'}
               </span>
             </div>
             {results.map((r, i) => (
               <motion.button
                 key={r.term.id}
                 onClick={() => selectResult(r)}
                 className="w-full text-left p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.04 }}
               >
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[r.term.category] }} />
                    <span className="font-orbitron text-sm font-bold text-white/90">{r.term.term}</span>
                    <span className="font-jetbrains text-[10px] text-white/20">{CATEGORY_LABELS[r.term.category]}</span>
                 </div>
                 <ChevronRight size={16} className="text-white/10 group-hover:text-[#00c3ff] transition-all" />
               </motion.button>
             ))}
          </motion.div>
        )}

        {/* Selected Context Panel */}
        {selected && (
          <motion.div key={selected.term.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
             {/* Preview Card */}
             <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 right-0 h-1" 
                  style={{ background: `linear-gradient(90deg, transparent, ${CATEGORY_COLORS[selected.term.category]}, transparent)` }} 
                />
                
                <div className="flex items-start justify-between mb-6">
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-white/5 border border-white/10 text-[#00c3ff]">
                          {CATEGORY_LABELS[selected.term.category]}
                        </span>
                        {selected.eli5 && <span className="text-[14px]">🧠</span>}
                      </div>
                      <h3 className="font-orbitron font-black text-2xl text-white">{selected.term.term}</h3>
                   </div>
                   <motion.button
                     onClick={() => onTermSelect?.(selected.term.id)}
                     className="btn-outline !h-8 !px-3 font-jetbrains text-[9px]"
                     whileTap={{ scale: 0.95 }}
                   >
                     {locale === 'pt' ? 'VER NO ORBE' : 'VIEW ON ORB'}
                   </motion.button>
                </div>
                
                <p className="font-inter text-sm text-white/60 leading-relaxed mb-6 italic">&ldquo;{selected.term.definition}&rdquo;</p>
                
                {/* Generation CTA */}
                <motion.button
                  onClick={copyContext}
                  className={`w-full py-5 rounded-2xl relative overflow-hidden border transition-all ${copied ? 'bg-[#14f195]/10 border-[#14f195] text-[#14f195]' : 'bg-[#00c3ff]/10 border-[#00c3ff] text-[#00c3ff]'}`}
                  whileHover={{ y: -2, boxShadow: `0 10px 40px ${copied ? '#14f195' : '#00c3ff'}20`, filter: 'brightness(1.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center gap-4">
                    {copied ? <Check size={20} /> : <Brain size={20} />}
                    <div className="text-left font-jetbrains">
                       <p className="font-black text-xs tracking-wider uppercase">
                        {copied ? (locale === 'pt' ? 'CONTEXTO COPIADO!' : 'CONTEXT COPIED!') : (locale === 'pt' ? 'COPIAR PROMPT PARA IDE' : 'COPY PROMPT TO IDE')}
                       </p>
                       <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">
                        {locale === 'pt' ? 'Injete no Cursor / Windsurf / Copilot' : 'Inject into Cursor / Windsurf / Copilot'}
                       </p>
                    </div>
                  </div>
                </motion.button>
             </div>

             {/* Included Content Logic */}
             <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ground Truth Definition", icon: <ShieldCheck size={14} />, ok: true },
                  { label: "Technical Aliases", icon: <ExternalLink size={14} />, ok: !!selected.term.aliases?.length },
                  { label: "Simplified Analogy", icon: <Brain size={14} />, ok: !!selected.eli5 },
                  { label: "Anchor/Rust Snippet", icon: <Code size={14} />, ok: !!selected.eli5?.snippet },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                     <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.ok ? 'bg-white/5 text-white/60' : 'bg-white/[0.01] text-white/10'}`}>
                        {item.icon}
                     </div>
                     <span className={`font-jetbrains text-[10px] uppercase tracking-widest ${item.ok ? 'text-white/40' : 'text-white/10'}`}>
                        {item.label}
                     </span>
                  </div>
                ))}
             </div>
             
             {results.length > 1 && (
               <button onClick={() => setSelected(null)} className="text-center font-jetbrains text-[10px] text-white/20 hover:text-white/40 tracking-widest py-2">
                 {locale === 'pt' ? '← VOLTAR PARA RESULTADOS' : '← BACK TO RESULTS'}
               </button>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
