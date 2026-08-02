export interface SentenceRange {
  start: number;
  end: number;
  text: string;
}

const FR_ABBREV = [
  "M.", "Mme", "Mlle", "MM.", "Dr", "Dr.", "Pr", "Pr.",
  "St", "St.", "Ste", "Ste.",
  "etc.", "cf.", "p.", "pp.", "vol.", "n°", "nº", "no.",
  "av.", "apr.", "av. J.-C.", "apr. J.-C.",
  "art.", "ch.", "fig.", "tab.",
  "ex.", "ed.", "éd.", "trad.", "vs.", "ibid.",
];

const ABBREV_LOWER = FR_ABBREV.map((a) => a.toLowerCase());

function isAbbreviationEndingAt(text: string, dotIndex: number): boolean {
  const window = text.slice(Math.max(0, dotIndex - 12), dotIndex + 1);
  const lower = window.toLowerCase();
  for (const ab of ABBREV_LOWER) {
    if (lower.endsWith(ab)) {
      const before = lower.charAt(lower.length - ab.length - 1);
      if (before === "" || /[\s(«"']/.test(before)) return true;
    }
  }
  return false;
}

function isInsideGuillemets(text: string, index: number): boolean {
  let opens = 0;
  for (let i = 0; i < index; i++) {
    const ch = text[i];
    if (ch === "«") opens++;
    else if (ch === "»") opens = Math.max(0, opens - 1);
  }
  return opens > 0;
}

function isDecimalDot(text: string, dotIndex: number): boolean {
  const prev = text[dotIndex - 1];
  const next = text[dotIndex + 1];
  return /\d/.test(prev ?? "") && /\d/.test(next ?? "");
}

const TERMINATORS = new Set([".", "!", "?", "…"]);

export function detectSentences(text: string): SentenceRange[] {
  if (text.length === 0) return [];
  const out: SentenceRange[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (TERMINATORS.has(ch!)) {
      let endTerm = i;
      while (endTerm + 1 < text.length && TERMINATORS.has(text[endTerm + 1]!)) endTerm++;

      const insideQuote = isInsideGuillemets(text, i);
      let isReal =
        !insideQuote &&
        !(ch === "." && isDecimalDot(text, i)) &&
        !(ch === "." && isAbbreviationEndingAt(text, i));

      // A terminator inside « » is still a real boundary if the next non-whitespace
      // character is the closing guillemet — consume the » into this sentence.
      if (!isReal && insideQuote) {
        let look = endTerm + 1;
        while (look < text.length && /\s/.test(text[look]!)) look++;
        if (text[look] === "»") {
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
