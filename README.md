---
name: "French Sentences"
tagline_fr: "Découpage de texte français en phrases, qui connaît les abréviations et les guillemets."
tagline_en: "Splits French text into sentences, and knows French abbreviations and guillemets."
about_en: "Splits French text into sentences. Knows French abbreviations, « guillemets » and decimals — where Intl.Segmenter does not. Zero dependencies, TypeScript, ESM."
facts_fr: "35 abréviations françaises, 26 tests, zéro dépendance d'exécution."
facts_en: "35 French abbreviations, 26 tests, zero runtime dependencies."
---

# french-sentences

[![npm](https://img.shields.io/npm/v/french-sentences)](https://www.npmjs.com/package/french-sentences)
[![zero dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](package.json)
[![types](https://img.shields.io/badge/types-included-blue)](dist/src/index.d.ts)
[![license](https://img.shields.io/npm/l/french-sentences)](LICENSE)

Splits French text into sentences — and gets right the things that make French
different: `M. Dupont`, `cf. p. 12`, `av. J.-C.`, and `« … »` dialogue.

```ts
import { detectSentences } from "french-sentences";

detectSentences("M. Dupont est arrivé. Il dit : « Bonjour. » Puis il partit.");
// [ "M. Dupont est arrivé. ",
//   "Il dit : « Bonjour. » ",
//   "Puis il partit." ]
```

## Why not just use `Intl.Segmenter`?

That is the right first question — it is built into Node and every browser, it
costs nothing, and for a lot of text it is fine. It is also the honest
comparison, so here it is, measured rather than asserted:

| Input | `Intl.Segmenter("fr")` | `detectSentences` |
|---|---|---|
| `M. Dupont est arrivé. Il attendit.` | 3 — splits after `M.` | **2** ✓ |
| `Le Dr. Martin a vu Mme. Leroy. Elle va bien.` | 4 — splits after both titles | **2** ✓ |
| `On cite l'ouvrage cf. p. 12. C'est utile.` | 3 — splits after `p.` | **2** ✓ |
| `Il est né av. J.-C. selon la légende. C'est étrange.` | 3 — splits inside `av. J.-C.` | **2** ✓ |
| `Il dit : « Il pensa. Il resta. » Fin.` | 3 — splits inside the quote | **2** ✓ |
| `Il dit : « Bonjour. » Puis il partit.` | 2, but orphans the `»` onto the next sentence | **2** ✓ |
| `Des pommes, des poires, etc. Puis il partit.` | 2 ✓ | **2** ✓ |
| `Il aime l'art. Puis il partit.` | 2 ✓ | **2** ✓ |
| `Le prix est de 5,4 euros. C'est cher.` | 2 ✓ | **2** ✓ |
| `Le prix est de 5.4 euros. C'est cher.` | 2 ✓ | **2** ✓ |

Ten cases: five where this library is right and `Intl.Segmenter` is wrong, five
ties, none the other way. `Intl.Segmenter` implements the Unicode sentence
boundary algorithm, which is deliberately language-neutral — it has no list of
French abbreviations and no notion that `»` closes a quotation. That is not a
bug in it; it is the gap this library fills.

**Use `Intl.Segmenter` if** you need many languages, or your text has no
abbreviations. **Use this** if your text is French prose, citations, or
dialogue.

## Install

```sh
npm install french-sentences
```

Node ≥ 20, ESM only, TypeScript types included.

## Usage

```ts
import { detectSentences } from "french-sentences";

const text = "M. Dupont est arrivé. Il dit : « Bonjour. » Puis il partit.";

for (const s of detectSentences(text)) {
  console.log(s.start, s.end, s.text);
}
```

### API

```ts
function detectSentences(text: string): SentenceRange[];

interface SentenceRange {
  start: number; // character offset into the input, inclusive
  end: number;   // character offset into the input, exclusive
  text: string;  // always === text.slice(start, end)
}
```

That is the entire public surface.

The ranges **partition the input exactly**: they are contiguous, non-overlapping,
in order, and cover every character including trailing whitespace — so
`detectSentences(t).map(s => s.text).join("") === t` for every input. This is
enforced by property tests, not just asserted here, which makes the offsets safe
to use for highlighting, annotation or mapping back into the source document.

## What it handles

**Titles never end a sentence.** `M.`, `MM.`, `Mme.`, `Mlle.`, `Dr.`, `Pr.`,
`Me.`, `Mgr.`, `St.`, `Ste.` are always followed by a name, so their period is
never a boundary.

**Other abbreviations are resolved by context.** `etc.`, `cf.`, `p.`, `art.`,
`vol.`, `fig.`, `chap.` and the rest *can* end a sentence — so what follows
decides:

```ts
detectSentences("Voir art. 5 du code. C'est clair.");   // 2 — `art.` holds
detectSentences("Il aime l'art. Puis il partit.");      // 2 — `art.` ends it
```

This matters more than it looks. A splitter that guards `etc.` unconditionally
swallows the sentence after it — the single most common French abbreviation,
silently merged into its neighbour.

**Compound abbreviations stay whole.** The internal period of `av. J.-C.` is
recognised as internal, so it is never a boundary — while the trailing period
still ends the sentence when a new one begins:

```ts
detectSentences("Il est né av. J.-C. selon la légende.");     // 1
detectSentences("Il est mort en 44 av. J.-C. Puis Rome changea."); // 2
```

**Quotations hold together.** A period inside `« … »` closes the sentence only
when the closing guillemet follows it — so a multi-sentence quotation stays one
unit, and the `»` is consumed into it rather than orphaned onto the next
sentence. Curly `“ … ”` works the same way.

**Decimals.** A period between digits is a decimal point, not a boundary
(`5.4`). French decimal commas (`5,4`) never needed a guard — a comma is not a
sentence terminator — but they are covered by tests so the claim is checked.

**Unbalanced quotes fail safe.** Only *matched* quote pairs count, so a stray
`«` from OCR or user input cannot swallow the rest of the document into one
sentence.

## What it does not handle

Stated plainly, because a segmenter that hides its edges wastes your afternoon:

- **Straight double quotes** (`"…"`) are not treated as a quotation pair. They
  are genuinely ambiguous — the same character opens and closes — so guessing
  would break more text than it fixes. Use `« »` or `“ ”`.
- **Abbreviations outside the list** are not recognised. There are 35, covering
  titles, citation and dating forms; domain-specific ones (medical, legal,
  military) are not included.
- **A contextual abbreviation followed by a capitalised proper noun** splits
  where it should not: `art. L. 123` reads the `L.` as a new sentence. Titles are
  exempt from this because they are in the always-guard class.
- **No sentence-level language detection.** It assumes its input is French. On
  English text it behaves like a slightly odd English splitter.

## Performance

One linear pass. Quote nesting depth is computed once up front rather than
rescanned per terminator, which matters on long documents:

| Input | Time |
|---|---|
| 11 000 chars | ~1.2 ms |
| 88 000 chars | ~3.4 ms |

A regression test asserts the scaling stays linear, so a future change that
reintroduces a per-terminator rescan fails the suite rather than quietly costing
seconds on a novel.

## Tests

```sh
npm test    # builds, then runs 26 tests under node --test
```

26 tests, no test-framework dependency beyond `fast-check` for the property
tests. `detectSentences` is a pure function from a string to offsets, so there
is nothing to stub and no I/O to mock.

Four of them are **property tests**: for arbitrary generated input, the ranges
must partition the input exactly, be contiguous and ordered, match their own
offsets, and be deterministic. Those hold for every input rather than the dozen
someone thought to write down.

The rest pin French behaviour by example, and each regression test carries the
bug it prevents. Every one of them was checked against the previous
implementation to confirm it actually fails there — a test that has never failed
proves nothing.

## Stability

`detectSentences` is the entire public API and its signature is settled;
`1.0.0` means that. Behaviour changes to segmentation are treated as breaking
and get a major bump, because a sentence splitter that silently changes its
output breaks its callers' stored offsets.

## Licence

MIT — see [LICENSE](LICENSE).

---

Made with care by [William](https://william.revah.paris)
