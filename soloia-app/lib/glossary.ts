/**
 * SOLOIA Glossary Engine
 * Loads and indexes all 1001 Solana terms from @stbr/solana-glossary data files
 * Uses direct JSON imports since the package dist is not built in the GitHub version
 */

import { PT_TRANSLATIONS } from "./translations_pt";

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: Category;
  aliases?: string[];
  related?: string[];
}

export type Category =
  | "core-protocol"
  | "programming-model"
  | "token-ecosystem"
  | "defi"
  | "zk-compression"
  | "infrastructure"
  | "security"
  | "dev-tools"
  | "network"
  | "blockchain-general"
  | "web3"
  | "programming-fundamentals"
  | "ai-ml"
  | "solana-ecosystem";

export const CATEGORY_LABELS: Record<Category, string> = {
  "core-protocol": "Core Protocol",
  "programming-model": "Programming Model",
  "token-ecosystem": "Token Ecosystem",
  defi: "DeFi",
  "zk-compression": "ZK & Compression",
  infrastructure: "Infrastructure",
  security: "Security",
  "dev-tools": "Dev Tools",
  network: "Network",
  "blockchain-general": "Blockchain General",
  web3: "Web3",
  "programming-fundamentals": "Programming Fundamentals",
  "ai-ml": "AI & ML",
  "solana-ecosystem": "Solana Ecosystem",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  "core-protocol": "#9945ff",
  "programming-model": "#14f195",
  "token-ecosystem": "#f7b731",
  defi: "#00c3ff",
  "zk-compression": "#ff6b9d",
  infrastructure: "#a8ff78",
  security: "#ff4757",
  "dev-tools": "#70a1ff",
  network: "#eccc68",
  "blockchain-general": "#ff7f50",
  web3: "#5352ed",
  "programming-fundamentals": "#2ed573",
  "ai-ml": "#ff6348",
  "solana-ecosystem": "#1e90ff",
};

// Server-side function to load all terms from @stbr/solana-glossary data files
export async function loadAllTerms(locale: string = "en"): Promise<GlossaryTerm[]> {
  const categories: Category[] = [
    "core-protocol",
    "programming-model",
    "token-ecosystem",
    "defi",
    "zk-compression",
    "infrastructure",
    "security",
    "dev-tools",
    "network",
    "blockchain-general",
    "web3",
    "programming-fundamentals",
    "ai-ml",
    "solana-ecosystem",
  ];

  const allTerms: GlossaryTerm[] = [];
  let translations: Record<string, { term: string; definition: string }> = {};

  // Load translations if not English
  if (locale === "pt") {
    try {
      const data = await import("@stbr/solana-glossary/data/i18n/pt.json");
      translations = data.default;
    } catch (e) {
      console.warn("Could not load PT translations", e);
    }
  }

  for (const category of categories) {
    try {
      const data = await import(
        `@stbr/solana-glossary/data/terms/${category}.json`
      );
      const terms = data.default as GlossaryTerm[];
      
      // Merge translations if available
      const localized = terms.map(t => {
        // Priority 1: Our curated manual PT translations
        if (locale === "pt" && PT_TRANSLATIONS[t.id]) {
          return {
            ...t,
            term: PT_TRANSLATIONS[t.id].term,
            definition: PT_TRANSLATIONS[t.id].definition
          };
        }

        // Priority 2: Library's PT translations (if provided and valid)
        if (translations[t.id]) {
          return {
            ...t,
            term: translations[t.id].term,
            definition: translations[t.id].definition
          };
        }
        return t;
      });

      allTerms.push(...localized);
    } catch {
      // Category file might not exist, skip silently
    }
  }

  return allTerms;
}

// Search terms — full-text across name, definition, aliases, id
export function searchTerms(
  query: string,
  terms: GlossaryTerm[]
): GlossaryTerm[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = terms.map((term) => {
    let score = 0;
    const name = term.term.toLowerCase();
    const def = term.definition.toLowerCase();
    const id = term.id.toLowerCase();
    const aliases = (term.aliases ?? []).map((a) => a.toLowerCase());

    // Exact ID match
    if (id === q) score += 100;
    // Exact alias match
    if (aliases.includes(q)) score += 100;
    // Name starts with query
    if (name.startsWith(q)) score += 80;
    // Alias starts with query
    if (aliases.some((a) => a.startsWith(q))) score += 70;
    // Name contains query
    if (name.includes(q)) score += 50;
    // Alias contains query
    if (aliases.some((a) => a.includes(q))) score += 40;
    // ID contains query
    if (id.includes(q)) score += 30;
    // Definition contains query
    if (def.includes(q)) score += 10;

    return { term, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.term);
}

// Get term by ID or alias (exact match, case-insensitive for aliases)
export function getTerm(
  idOrAlias: string,
  terms: GlossaryTerm[]
): GlossaryTerm | undefined {
  const q = idOrAlias.toLowerCase();
  return terms.find(
    (t) =>
      t.id === q ||
      (t.aliases ?? []).some((a) => a.toLowerCase() === q) ||
      t.term.toLowerCase() === q
  );
}

// Extract the most likely keyword from a speech transcript
export function extractKeyword(transcript: string): string {
  const cleaned = transcript.toLowerCase().trim();

  // Remove common filler phrases
  const fillers = [
    "what is",
    "what are",
    "explain",
    "define",
    "tell me about",
    "what does",
    "how does",
    "how do",
    "can you explain",
    "what's",
    "whats",
    "what",
    "describe",
    "give me",
    "show me",
    "search for",
    "look up",
    "find",
    "the",
    "a",
    "an",
    "mean",
    "means",
    "is",
  ];

  let keyword = cleaned;
  for (const filler of fillers) {
    keyword = keyword.replace(new RegExp(`\\b${filler}\\b`, "g"), "").trim();
  }

  return keyword.trim() || cleaned;
}
