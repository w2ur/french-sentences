export interface SentenceRange {
  start: number;
  end: number;
  text: string;
}

/**
 * Abbreviations whose trailing period can never close a sentence, because
 * something always follows them: a title is followed by a name.
 */
const ABBREV_ALWAYS = [
  "m.", "mm.", "mme.", "mlle.", "mgr.", "me.",
  "dr.", "pr.", "st.", "ste.",
];

/**
 * Abbreviations whose trailing period may or may not close a sentence.
 * `art. 5 du code` continues; `il aime l'art. Puis…` ends. Which one it is
 * cannot be read off the abbreviation itself — only off what follows it.
 */
const ABBREV_CONTEXTUAL = [
  "etc.", "cf.", "p.", "pp.", "vol.", "no.",
  "av.", "apr.", "av. j.-c.", "apr. j.-c.", "j.-c.",
  "art.", "ch.", "chap.", "fig.", "tab.", "ex.", "p. ex.",
  "ed.", "éd.", "trad.", "vs.", "ibid.", "env.", "suiv.",
];

/**
 * Sorted longest-first so that a compound abbreviation is matched in
 * preference to the shorter one nested inside it: `av. J.-C.` must win over
 * `av.`, or the period after `J` would be read as a sentence boundary.
 */
const ABBREVS: ReadonlyArray<{ readonly text: string; readonly contextual: boolean }> = [
  ...ABBREV_ALWAYS.map((text) => ({ text, contextual: false })),
  ...ABBREV_CONTEXTUAL.map((text) => ({ text, contextual: true })),
].sort((a, b) => b.text.length - a.text.length);

/** What may precede an abbreviation: whitespace, or an opening delimiter. */
const WORD_BOUNDARY = /[\s(«“"'’]/;

/** Paired quotation marks. Straight `"` is deliberately absent — see README. */
const QUOTE_OPEN = new Set(["«", "“"]);
const QUOTE_CLOSE = new Set(["»", "”"]);

/**
 * Nesting depth of *matched* quote pairs at every index, in one pass.
 *
 * Only matched pairs count. An opening `«` with no closing `»` contributes
 * nothing, so a stray quotation mark cannot swallow the rest of the document
 * into a single sentence.
 */
function quoteDepths(text: string): Int32Array {
  const delta = new Int32Array(text.length + 1);
  const open: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (QUOTE_OPEN.has(ch)) {
      open.push(i);
    } else if (QUOTE_CLOSE.has(ch)) {
      const from = open.pop();
      if (from !== undefined) {
        delta[from]! += 1;
        delta[i + 1]! -= 1;
      }
    }
  }
  for (let i = 1; i <= text.length; i++) delta[i]! += delta[i - 1]!;
  return delta;
}

/** Does a new sentence appear to begin at the first non-space character from `from`? */
function startsNewSentence(text: string, from: number): boolean {
  let i = from;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  if (i >= text.length) return true;
  return /[\p{Lu}«“]/u.test(text[i]!);
}

type AbbrevVerdict = "guard" | "boundary" | null;

/**
 * Classify a period that may belong to an abbreviation.
 *
 * `guard`    — the period is part of an abbreviation and is not a boundary.
 * `boundary` — the period ends an abbreviation that can also end a sentence,
 *              and what follows looks like a new sentence.
 * `null`     — the period belongs to no listed abbreviation.
 *
 * The period does not have to be the abbreviation's last character: matching
 * spans the whole abbreviation, so the internal period of `av. J.-C.` is
 * recognised as internal and never treated as a boundary.
 */
function classifyAbbreviation(text: string, dotIndex: number): AbbrevVerdict {
  for (const ab of ABBREVS) {
    const len = ab.text.length;
    for (let k = 0; k < len; k++) {
      if (ab.text[k] !== ".") continue;
      const start = dotIndex - k;
      const end = start + len;
      if (start < 0 || end > text.length) continue;
      if (text.slice(start, end).toLowerCase() !== ab.text) continue;
      if (start > 0 && !WORD_BOUNDARY.test(text[start - 1]!)) continue;

      // A period inside an abbreviation can never close a sentence.
      if (k < len - 1) return "guard";
      if (!ab.contextual) return "guard";
      return startsNewSentence(text, end) ? "boundary" : "guard";
    }
  }
  return null;
}

/** A period with digits on both sides is a decimal point, not a boundary. */
function isDecimalDot(text: string, dotIndex: number): boolean {
  const prev = text[dotIndex - 1];
  const next = text[dotIndex + 1];
  return /\d/.test(prev ?? "") && /\d/.test(next ?? "");
}

const TERMINATORS = new Set([".", "!", "?", "…"]);

export function detectSentences(text: string): SentenceRange[] {
  if (text.length === 0) return [];
  const depth = quoteDepths(text);
  const out: SentenceRange[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (TERMINATORS.has(ch)) {
      let endTerm = i;
      while (endTerm + 1 < text.length && TERMINATORS.has(text[endTerm + 1]!)) endTerm++;

      const insideQuote = depth[i]! > 0;
      let isReal = !insideQuote;
      if (isReal && ch === ".") {
        isReal = !isDecimalDot(text, i) && classifyAbbreviation(text, i) !== "guard";
      }

      // A terminator inside « » is still a real boundary if the next non-whitespace
      // character is the closing guillemet — consume the » into this sentence.
      if (!isReal && insideQuote) {
        let look = endTerm + 1;
        while (look < text.length && /\s/.test(text[look]!)) look++;
        if (look < text.length && QUOTE_CLOSE.has(text[look]!)) {
          isReal = true;
          endTerm = look;
        }
      }

      if (isReal) {
        let end = endTerm + 1;
        while (end < text.length && /\s/.test(text[end]!)) end++;
        if (end >= text.length || /\S/.test(text[end]!)) {
          out.push({ start, end, text: text.slice(start, end) });
          start = end;
          i = end;
          continue;
        }
      }
      i = endTerm + 1;
    } else {
      i++;
    }
  }
  if (start < text.length) {
    out.push({ start, end: text.length, text: text.slice(start) });
  }
  return out;
}
