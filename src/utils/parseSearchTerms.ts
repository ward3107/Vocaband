/**
 * Parse a teacher's free-text vocabulary search into discrete search
 * terms.  Quote-wrapped phrases ("ice cream", 'washing machine') stay
 * intact; everything else is split on commas / newlines only — spaces
 * are part of a word, not a separator, because the corpus contains
 * multi-word entries like "post office".  All terms are lower-cased.
 *
 * Pulled out of App.tsx (useCallback inline) — it has no closure deps,
 * so it's a plain pure function now.  useMemo on the consumer side
 * still memoises the parsed array.
 */
export function parseSearchTerms(query: string): string[] {
  if (!query.trim()) return [];

  const terms: string[] = [];

  // Extract quote-wrapped phrases first (e.g., "ice cream", 'washing machine')
  const quoteRegex = /(["'])(?:(?=(\\1?))\2.)*?\1/g;
  const quotes: string[] = [];
  let match;
  while ((match = quoteRegex.exec(query)) !== null) {
    quotes.push(match[0].replace(/['"]/g, '').trim().toLowerCase());
  }

  // Remove quoted phrases from remaining text
  const remainingText = query.replace(/(["'])(?:(?=(\\1?))\2.)*?\1/g, '');

  // Split by comma or newline ONLY — spaces are part of the word
  const splitTerms = remainingText
    .split(/[,\n]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);

  terms.push(...quotes, ...splitTerms);

  return terms;
}
