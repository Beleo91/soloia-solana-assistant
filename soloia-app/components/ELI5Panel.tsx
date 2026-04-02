"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ELI5Entry } from "@/lib/eli5";

interface ELI5PanelProps {
  eli5: ELI5Entry;
  termName: string;
}

const LANG_LABELS: Record<string, string> = {
  rust: "Rust / Anchor",
  typescript: "TypeScript",
  bash: "Terminal",
};

const LANG_COLORS: Record<string, string> = {
  rust: "#f97316", // orange
  typescript: "#3b82f6", // blue
  bash: "#22c55e", // green
};

export function ELI5Panel({ eli5, termName }: ELI5PanelProps) {
  const [showSnippet, setShowSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    if (!eli5.snippet) return;
    await navigator.clipboard.writeText(eli5.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lang = eli5.snippetLang || "rust";
  const langColor = LANG_COLORS[lang];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full"
    >
      {/* ── ELI5 Analogy ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 mb-3"
        style={{
          background: "rgba(20, 241, 149, 0.05)",
          border: "1px solid rgba(20, 241, 149, 0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg text-sm"
            style={{ background: "rgba(20, 241, 149, 0.15)" }}
          >
            🧠
          </div>
          <div>
            <span
              className="font-orbitron text-xs font-bold tracking-widest"
              style={{ color: "#14f195" }}
            >
              ELI5 — EXPLICA SIMPLES
            </span>
            <p className="font-jetbrains text-xs" style={{ color: "var(--text-muted)" }}>
              O que é {termName} na vida real?
            </p>
          </div>
        </div>

        {/* Analogy text */}
        <p
          className="font-inter text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {eli5.analogy}
        </p>
      </div>

      {/* ── Code Snippet ─────────────────────────────────────────────────── */}
      {eli5.snippet && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: `1px solid ${langColor}30`,
            background: "rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Snippet header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              background: `${langColor}10`,
              borderBottom: `1px solid ${langColor}20`,
            }}
          >
            <div className="flex items-center gap-3">
              {/* Traffic lights */}
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="font-jetbrains text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    color: langColor,
                    background: `${langColor}15`,
                    border: `1px solid ${langColor}30`,
                  }}
                >
                  {LANG_LABELS[lang]}
                </span>
                {eli5.snippetTitle && (
                  <span
                    className="font-jetbrains text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {eli5.snippetTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Copy button */}
            <motion.button
              onClick={copySnippet}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-jetbrains text-xs transition-all duration-200"
              style={{
                background: copied ? "rgba(20, 241, 149, 0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${copied ? "rgba(20,241,149,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: copied ? "#14f195" : "var(--text-muted)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Copiar
                </>
              )}
            </motion.button>
          </div>

          {/* Toggle expand */}
          <button
            onClick={() => setShowSnippet(!showSnippet)}
            className="w-full flex items-center justify-between px-4 py-2 group"
            style={{
              borderBottom: showSnippet ? `1px solid ${langColor}15` : "none",
            }}
          >
            <span
              className="font-jetbrains text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {showSnippet ? "▾ Ocultar código" : "▸ Ver código de exemplo"}
            </span>
            <span
              className="font-jetbrains text-xs"
              style={{ color: langColor, opacity: 0.7 }}
            >
              {eli5.snippet.split("\n").length} linhas
            </span>
          </button>

          {/* Snippet code block */}
          <AnimatePresence>
            {showSnippet && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden" }}
              >
                <pre
                  className="p-4 overflow-x-auto"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.75rem",
                    lineHeight: "1.6",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CodeHighlight code={eli5.snippet} lang={lang} />
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ── Minimal syntax highlighter (no external deps) ─────────────────────────────

function CodeHighlight({ code, lang }: { code: string; lang: string }) {
  if (lang === "bash") {
    return (
      <>
        {code.split("\n").map((line, i) => (
          <div key={i}>
            {line.startsWith("#") ? (
              <span style={{ color: "#6b7280" }}>{line}</span>
            ) : line.startsWith("//") ? (
              <span style={{ color: "#6b7280" }}>{line}</span>
            ) : line.trim().startsWith("$") || (!line.startsWith(" ") && line.trim() && !line.startsWith("//")) ? (
              <span>
                <span style={{ color: "#14f195" }}>$ </span>
                <span style={{ color: "#e2e8f0" }}>{line.replace(/^\$\s*/, "")}</span>
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>{line}</span>
            )}
            {"\n"}
          </div>
        ))}
      </>
    );
  }

  // Generic tokenizer for Rust/TypeScript
  const keywords =
    lang === "rust"
      ? ["pub", "fn", "use", "let", "mut", "struct", "impl", "mod", "const", "type", "enum", "match", "if", "else", "return", "Ok", "Err", "Result", "Option", "Some", "None", "true", "false", "self", "Self", "async", "await", "for", "in", "while", "loop", "break", "continue"]
      : ["const", "let", "var", "function", "async", "await", "return", "import", "export", "from", "new", "class", "extends", "interface", "type", "if", "else", "for", "while", "of", "in", "true", "false", "null", "undefined", "typeof", "instanceof", "throw", "try", "catch", "finally"];

  const keywordPattern = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");

  return (
    <>
      {code.split("\n").map((line, i) => {
        // Comment lines
        if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
          return (
            <div key={i}>
              <span style={{ color: "#4b5563" }}>{line}</span>
              {"\n"}
            </div>
          );
        }

        // Simple line-by-line rendering with keyword coloring
        const colorized = line
          .replace(/(".*?"|'.*?'|`.*?`)/g, (match) => `\x00STRING\x01${match}\x00END\x01`)
          .replace(keywordPattern, (match) => `\x00KW\x01${match}\x00END\x01`)
          .replace(/\b(\d+)\b/g, (match) => `\x00NUM\x01${match}\x00END\x01`);

        const parts = colorized.split(/(\x00(?:STRING|KW|NUM)\x01.*?\x00END\x01)/);

        return (
          <div key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("\x00STRING\x01")) {
                return <span key={j} style={{ color: "#86efac" }}>{part.replace(/\x00STRING\x01|\x00END\x01/g, "")}</span>;
              }
              if (part.startsWith("\x00KW\x01")) {
                return <span key={j} style={{ color: "#c084fc" }}>{part.replace(/\x00KW\x01|\x00END\x01/g, "")}</span>;
              }
              if (part.startsWith("\x00NUM\x01")) {
                return <span key={j} style={{ color: "#fb923c" }}>{part.replace(/\x00NUM\x01|\x00END\x01/g, "")}</span>;
              }
              return <span key={j} style={{ color: "var(--text-secondary)" }}>{part}</span>;
            })}
            {"\n"}
          </div>
        );
      })}
    </>
  );
}
