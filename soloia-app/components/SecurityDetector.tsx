"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Search, 
  ExternalLink, 
  ChevronDown, 
  Code,
  AlertTriangle,
  Info,
  Pause,
  Square,
  Play,
  Upload,
  FileCode,
  Trash2,
  Bug
} from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import {
  analyzeCode,
  SecurityReport,
  SecurityFinding,
  SEVERITY_CONFIG,
  DEMO_VULNERABLE_CODE,
} from "@/lib/security";
import { ELI5Panel } from "./ELI5Panel";
import { useSecurityAlert } from "@/hooks/useSecurityAlert";
import { GlossaryTerm, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/glossary";
import { ELI5Entry } from "@/lib/eli5";

interface SecurityDetectorProps {
  onGlossaryLookup?: (termId: string) => void;
  locale?: "en" | "pt";
}

// ── Code Editor Component ───────────────────────────────────────────────
function CodeEditor({
  value,
  onChange,
  highlightedLines,
  locale
}: {
  value: string;
  onChange: (v: string) => void;
  highlightedLines: Set<number>;
  locale: "en" | "pt";
}) {
  const lines = value.split("\n");

  return (
    <div className="relative flex rounded-2xl overflow-hidden bg-black/40 border border-white/10 font-jetbrains text-xs">
      {/* Line numbers */}
      <div className="flex-shrink-0 py-4 px-3 text-right select-none bg-black/30 border-right border-white/5 min-w-[3.5rem] leading-relaxed text-white/20">
        {lines.map((_, i) => {
          const lineNum = i + 1;
          const isHighlighted = highlightedLines.has(lineNum);
          return (
            <div key={i} className={isHighlighted ? "text-[#ff4757] font-bold" : ""}>
              {lineNum}
            </div>
          );
        })}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={locale === 'pt' ? "// Cole código Anchor/Rust para auditoria..." : "// Paste Anchor/Rust code for audit..."}
        className="flex-1 py-4 px-4 bg-transparent outline-none resize-none leading-relaxed text-white/70 caret-[#9945ff]"
        rows={14}
        spellCheck={false}
      />
    </div>
  );
}

// ── Score Ring Component ────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#14f195" : score >= 50 ? "#f7b731" : "#ff4757";

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="drop-shadow-[0_0_8px_rgba(var(--color-rgb),0.5)]"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-orbitron font-black text-xl" style={{ color }}>{score}</span>
        <span className="font-jetbrains text-[9px] text-white/20">/100</span>
      </div>
    </div>
  );
}

// ── Finding Card Component ───────────────────────────────────────────────
function FindingCard({
  finding,
  index,
  onLookup,
  locale
}: {
  finding: SecurityFinding;
  index: number;
  onLookup?: (termId: string) => void;
  locale: "en" | "pt";
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [glossaryData, setGlossaryData] = useState<{ term: GlossaryTerm; eli5?: ELI5Entry; } | null>(null);
  const { speak, pause, resume, stop, isPlaying, isPaused } = useTTS();
  const sev = SEVERITY_CONFIG[finding.rule.severity];

  const loadDataAndToggle = async () => {
    if (!glossaryData) {
      try {
        const res = await fetch(`/api/glossary?id=${finding.rule.glossaryTermId}&lang=${locale}`);
        const data = await res.json();
        if (data.term) setGlossaryData({ term: data.term, eli5: data.eli5 });
      } catch {}
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border overflow-hidden transition-all bg-black/20"
      style={{ borderColor: `${sev.color}30` }}
    >
      <div className="w-full text-left p-4 flex items-start justify-between group">
        <button onClick={loadDataAndToggle} className="flex items-start gap-4 flex-1">
          <div className="mt-1" style={{ color: sev.color }}>
            {finding.rule.severity === 'critical' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-1">
                <span className="font-orbitron text-[10px] font-black uppercase tracking-widest" style={{ color: sev.color }}>
                   {sev.label}
                </span>
                <span className="font-jetbrains text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
                   {finding.rule.category}
                </span>
             </div>
             <p className="font-orbitron text-sm font-bold text-white/90 group-hover:text-white transition-colors">{finding.rule.name}</p>
          </div>
        </button>
        
        <div className="flex items-center gap-2 mt-1">
          {/* TTS Controls */}
          <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isPlaying && !isPaused ? (
              <button onClick={() => speak(finding.rule.description + ". " + finding.rule.fix, locale)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors" style={{ color: sev.color }}><Play size={12} fill="currentColor" /></button>
            ) : isPaused ? (
              <button onClick={resume} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-[#14f195]"><Play size={12} fill="currentColor" /></button>
            ) : (
              <button onClick={pause} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-[#f7b731]"><Pause size={12} fill="currentColor" /></button>
            )}
            {(isPlaying || isPaused) && (
              <button onClick={stop} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors text-white/20 hover:text-[#ff4757]"><Square size={10} fill="currentColor" /></button>
            )}
          </div>
          <ChevronDown size={18} onClick={loadDataAndToggle} className={`text-white/20 transition-transform cursor-pointer ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
               <p className="font-inter text-xs text-white/60 mb-4 leading-relaxed">{finding.rule.description}</p>
               
               {/* Impact/Fix Section */}
               <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 mb-4">
                  <div className="flex items-center gap-2 mb-2 text-[#14f195]">
                     <ShieldCheck size={14} />
                     <span className="font-orbitron font-bold text-[10px] tracking-widest uppercase">
                       {locale === 'pt' ? 'DIRETRIZ DE SEGURANÇA' : 'SECURITY DIRECTIVE'}
                     </span>
                  </div>
                  <p className="font-jetbrains text-[11px] text-white/80 mb-3">{finding.rule.fix}</p>
                  {finding.rule.fixExample && (
                    <pre className="p-3 rounded-lg bg-black/40 border border-[#14f195]/20 text-[#14f195] font-jetbrains text-[10px] overflow-x-auto">
                      {finding.rule.fixExample}
                    </pre>
                  )}
               </div>

               {/* Glossary Cross-Ref */}
               {glossaryData && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[#9945ff]">
                           <Zap size={14} />
                           <span className="font-orbitron font-bold text-[10px] tracking-widest uppercase">SOLOIA GLOSSARY</span>
                        </div>
                        {onLookup && (
                          <button onClick={() => onLookup(finding.rule.glossaryTermId)} className="text-[10px] font-jetbrains text-[#9945ff] hover:underline flex items-center gap-1">
                            {locale === 'pt' ? 'Ver completo' : 'View full'} <ExternalLink size={10} />
                          </button>
                        )}
                     </div>
                     <p className="font-inter text-[11px] text-white/40 mb-3 italic">&ldquo;{glossaryData.term.definition}&rdquo;</p>
                     {glossaryData.eli5 && <ELI5Panel eli5={glossaryData.eli5} termName={glossaryData.term.term} />}
                  </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main SecurityDetector Component ─────────────────────────────────────────

export function SecurityDetector({ onGlossaryLookup, locale = "pt" }: SecurityDetectorProps) {
  const [code, setCode] = useState("");
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set());
  const { playAlert } = useSecurityAlert();
  const { speak } = useTTS();

  useEffect(() => {
    if (report) {
      setReport(null);
      setHighlightedLines(new Set());
    }
  }, [code]);

  const analyze = useCallback(async () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);
    setReport(null);
    setShowRedFlash(false);

    await new Promise((r) => setTimeout(r, 1200));

    const result = analyzeCode(code);
    setReport(result);

    const allLines = new Set<number>();
    result.findings.forEach((f) => f.lines.forEach((l) => allLines.add(l)));
    setHighlightedLines(allLines);

    if (result.criticalCount > 0) {
      setShowRedFlash(true);
      playAlert("critical");
      setTimeout(() => setShowRedFlash(false), 1500);
    } else {
      playAlert(result.warningCount > 0 ? "warning" : "safe");
    }
    setIsAnalyzing(false);
  }, [code, playAlert]);

  const criticals = report?.findings.filter((f) => f.rule.severity === "critical") ?? [];
  const warnings = report?.findings.filter((f) => f.rule.severity === "warning") ?? [];
  const infos = report?.findings.filter((f) => f.rule.severity === "info") ?? [];

  return (
    <div className="w-full">
      {/* Red Flash Overlay */}
      <AnimatePresence>
        {showRedFlash && (
          <motion.div className="fixed inset-0 pointer-events-none z-[9999]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0.2, 0.4, 0] }} transition={{ duration: 1.5 }}>
            <div className="w-full h-full bg-[#ff4757]/40" />
            <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-10 rounded-3xl bg-black/90 border-2 border-[#ff4757] shadow-[0_0_100px_#ff475750] text-center" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
               <ShieldAlert size={64} className="text-[#ff4757] mx-auto mb-4" />
               <h3 className="font-orbitron font-black text-2xl text-[#ff4757] tracking-tight">{locale === 'pt' ? 'VULNERABILIDADE DETECTADA!' : 'VULNERABILITY DETECTED!'}</h3>
               <p className="font-jetbrains text-xs text-white/50 mt-2">{report?.criticalCount} CRITICAL FINDINGS</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#9945ff]/10 border border-[#9945ff]/20 flex items-center justify-center">
            <ShieldCheck className="text-[#9945ff]" size={24} />
          </div>
          <div>
            <h2 className="font-orbitron font-black text-xl tracking-tight" style={{ color: "#9945ff" }}>
              {locale === 'pt' ? 'DETETIVE DE SEGURANÇA' : 'SECURITY DETECTIVE'}
            </h2>
            <p className="font-jetbrains text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
              {locale === 'pt' ? 'Auditoria Estática de Contratos Anchor' : 'Static Audit for Anchor Contracts'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setCode(DEMO_VULNERABLE_CODE)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 font-orbitron font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <FileCode size={14} />
            <span>DEMO</span>
          </motion.button>
        </div>
      </div>

      <div className="mb-6">
        <CodeEditor value={code} onChange={setCode} highlightedLines={highlightedLines} locale={locale} />
      </div>

      <motion.button
        onClick={analyze}
        disabled={!code.trim() || isAnalyzing}
        className={`w-full py-5 rounded-2xl font-orbitron font-black text-xs tracking-[0.2em] transition-all border ${!code.trim() ? 'bg-white/5 border-white/10 text-white/10' : 'bg-gradient-to-r from-[#9945ff] to-[#14f195] text-white border-transparent'}`}
        whileTap={{ scale: 0.98 }}
        style={{
          boxShadow: code.trim() && !isAnalyzing ? "0 0 25px rgba(153, 69, 255, 0.4)" : "none"
        }}
        whileHover={code.trim() && !isAnalyzing ? { filter: "brightness(1.1)", boxShadow: "0 0 35px rgba(20, 241, 149, 0.5)" } : {}}
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-3">
             <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Search size={16} /></motion.div>
             {locale === 'pt' ? 'EXECUTANDO AUDITORIA...' : 'RUNNING AUDIT...'}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
             <Zap size={16} />
             {locale === 'pt' ? 'INICIAR SCAN DE SEGURANÇA' : 'START SECURITY SCAN'}
          </span>
        )}
      </motion.button>

      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="flex items-center gap-8 p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl">
             <ScoreRing score={report.score} />
             <div className="flex-1">
                <h4 className="font-orbitron font-bold text-lg text-white mb-4">
                  {report.score >= 80 ? (locale === 'pt' ? '✓ Estação Segura' : '✓ Safe Station') : (locale === 'pt' ? '⚠ Riscos Detectados' : '⚠ Risks Detected')}
                </h4>
                <div className="flex gap-6">
                   <div className="flex flex-col"><span className="font-orbitron font-black text-xl text-[#ff4757]">{report.criticalCount}</span><span className="font-jetbrains text-[10px] text-white/20 uppercase tracking-widest">Critical</span></div>
                   <div className="flex flex-col"><span className="font-orbitron font-black text-xl text-[#f7b731]">{report.warningCount}</span><span className="font-jetbrains text-[10px] text-white/20 uppercase tracking-widest">Warning</span></div>
                   <div className="flex flex-col"><span className="font-orbitron font-black text-xl text-[#00c3ff]">{report.infoCount}</span><span className="font-jetbrains text-[10px] text-white/20 uppercase tracking-widest">Info</span></div>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-3">
             {criticals.map((f, i) => <FindingCard key={i} finding={f} index={i} onLookup={onGlossaryLookup} locale={locale} />)}
             {warnings.map((f, i) => <FindingCard key={i+10} finding={f} index={i+10} onLookup={onGlossaryLookup} locale={locale} />)}
             {infos.map((f, i) => <FindingCard key={i+20} finding={f} index={i+20} onLookup={onGlossaryLookup} locale={locale} />)}
          </div>
        </motion.div>
      )}
    </div>
  );
}
