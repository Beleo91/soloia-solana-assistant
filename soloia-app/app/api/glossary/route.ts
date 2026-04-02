import { NextRequest, NextResponse } from "next/server";
import { loadAllTerms, searchTerms, getTerm } from "@/lib/glossary";
import { getELI5 } from "@/lib/eli5";

// Server-side cache — keyed by language
const _termsCache: Record<string, Awaited<ReturnType<typeof loadAllTerms>> | null> = {
  en: null,
  pt: null,
};

async function getTerms(lang: string = "pt") {
  const locale = lang === "en" ? "en" : "pt";
  
  if (!_termsCache[locale]) {
    _termsCache[locale] = await loadAllTerms(locale);

    // ── SOLOIA SDK Debug Log ──────────────────────────────────────────────
    const terms = _termsCache[locale]!;
    const categories = [...new Set(terms.map((t) => t.category))];
    const sample = terms[0];
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log(`║      SOLOIA — @stbr/solana-glossary [${locale.toUpperCase()}] CARREGADO!    ║`);
    console.log("╠════════════════════════════════════════════════════════╣");
    console.log(`║  ✅ Total de termos: ${String(terms.length).padEnd(33)}║`);
    console.log(`║  ✅ Categorias:      ${String(categories.length).padEnd(33)}║`);
    console.log(`║  ✅ 1º termo:        ${String(sample?.term ?? "N/A").substring(0, 33).padEnd(33)}║`);
    console.log("╚════════════════════════════════════════════════════════╝");
    // ─────────────────────────────────────────────────────────────────────
  }
  return _termsCache[locale]!;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const id = searchParams.get("id") || "";
    const mode = searchParams.get("mode") || "search";
    const lang = searchParams.get("lang") || "pt";

    const terms = await getTerms(lang);

    // Return all terms metadata
    if (mode === "all") {
      return NextResponse.json({
        total: terms.length,
        categories: [...new Set(terms.map((t) => t.category))],
      });
    }

    // Voice mode: search (we could add keyword extraction here if needed)
    if (mode === "voice" && query) {
      const results = searchTerms(query, terms);
      const enriched = results.slice(0, 5).map((t) => ({
        ...t,
        eli5: getELI5(t.id),
      }));
      return NextResponse.json({
        original: query,
        results: enriched,
        total: results.length,
      });
    }

    // Error decode mode: extract all matching terms from a block of text
    if (mode === "error" && query) {
      const tokens = extractTokensFromError(query);
      const found: Array<{ term: (typeof terms)[0]; matchedToken: string }> = [];
      const seen = new Set<string>();

      for (const token of tokens) {
        if (token.length < 3) continue;
        const results = searchTerms(token, terms);
        if (results.length > 0) {
          const top = results[0];
          if (!seen.has(top.id)) {
            seen.add(top.id);
            found.push({ term: top, matchedToken: token });
          }
        }
        if (found.length >= 10) break; // max 10 terms
      }

      const enriched = found.map(({ term, matchedToken }) => ({
        term,
        matchedToken,
        eli5: getELI5(term.id),
      }));

      return NextResponse.json({ results: enriched, total: enriched.length, query });
    }

    // Get by exact ID — includes ELI5
    if (id) {
      const term = getTerm(id, terms);
      if (!term) {
        return NextResponse.json({ error: "Term not found" }, { status: 404 });
      }
      const related = (term.related ?? [])
        .map((rid) => getTerm(rid, terms))
        .filter((t): t is NonNullable<typeof t> => !!t)
        .slice(0, 4);
      return NextResponse.json({
        term,
        related,
        eli5: getELI5(term.id),
      });
    }

    // Regular text search — includes ELI5
    if (query) {
      const results = searchTerms(query, terms);
      const enriched = results.slice(0, 10).map((t) => ({
        ...t,
        eli5: getELI5(t.id),
      }));
      return NextResponse.json({
        results: enriched,
        total: results.length,
        query,
      });
    }

    // Random terms for initial exploration
    const shuffled = [...terms].sort(() => Math.random() - 0.5);
    return NextResponse.json({
      results: shuffled.slice(0, 6),
      total: terms.length,
    });
  } catch (error) {
    console.error("[SOLOIA API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error loading glossary" },
      { status: 500 }
    );
  }
}

/**
 * Extract meaningful tokens from error text for glossary cross-reference
 */
function extractTokensFromError(errorText: string): string[] {
  const text = errorText.toLowerCase();
  const tokens: string[] = [];

  // Regular words
  const words = text.match(/[a-z][a-z0-9_-]{2,}/g) || [];
  tokens.push(...words);

  // PascalCase / CamelCase split
  const camelSplit = errorText.match(/[A-Z][a-z]+/g) || [];
  tokens.push(...camelSplit.map((w) => w.toLowerCase()));

  // Error codes
  const errorCodes = text.match(/error\s+0x[0-9a-f]+/g) || [];
  tokens.push(...errorCodes);

  // Known programs
  const knownPrograms: Record<string, string> = {
    "11111111111111111111111111111111": "system-program",
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf8Ss6PAjmnh: "spl-token",
    ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bRS: "associated-token-account",
    metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: "metaplex-metadata",
  };
  for (const [key, value] of Object.entries(knownPrograms)) {
    if (text.includes(key.toLowerCase())) tokens.push(value);
  }

  return [...new Set(tokens)].sort((a, b) => b.length - a.length);
}
