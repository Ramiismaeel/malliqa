// Arabic text normalization used by search and by AI ingredient-name mapping.
// Pure functions only — no browser APIs.

// Tashkeel (harakat), superscript alef, and tatweel.
const DIACRITICS = /[ً-ٰٟـ]/g;
const ARABIC_INDIC_DIGITS = /[٠-٩]/g;
const NON_WORD = /[^\p{L}\p{N}\s]/gu;

/**
 * Normalizes Arabic text so that spelling variants compare equal:
 * أ/إ/آ → ا, ة → ه, ى → ي, removes diacritics and the definite article "ال".
 */
export function normalizeArabic(input: string): string {
  return input
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .replace(NON_WORD, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stripDefiniteArticle)
    .join(" ");
}

function stripDefiniteArticle(word: string): string {
  if (word.length > 3 && word.startsWith("ال")) return word.slice(2);
  // "وال…" / "بال…" / "لل…" prefixes
  if (word.length > 4 && /^[وبفك]ال/.test(word)) return word.slice(3);
  if (word.length > 3 && word.startsWith("لل")) return word.slice(2);
  return word;
}

/** True when every word of `query` appears (as a substring) in `haystack`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;
  const h = normalizeArabic(haystack);
  return q.split(" ").every((word) => h.includes(word));
}
