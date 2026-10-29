<!-- portfolio
name: "French Sentences"
tagline_fr: "Découpage de texte français en phrases, qui connaît les abréviations et les guillemets."
tagline_en: "Splits French text into sentences, and knows French abbreviations and guillemets."
about_en: "Splits French text into sentences. Knows French abbreviations, « guillemets » and decimals — where Intl.Segmenter does not. Zero dependencies, TypeScript, ESM."
facts_fr: "35 abréviations françaises, 26 tests, zéro dépendance d'exécution."
facts_en: "35 French abbreviations, 26 tests, zero runtime dependencies."
-->

# French Sentences

Splits French text into sentences — and gets right the things that make French
different: `M. Dupont`, `cf. p. 12`, `av. J.-C.`, and `« … »` dialogue.

**Status:** maintained · public · published on npm as
[`french-sentences`](https://www.npmjs.com/package/french-sentences)

[![npm](https://img.shields.io/npm/v/french-sentences)](https://www.npmjs.com/package/french-sentences)
[![node](https://img.shields.io/node/v/french-sentences)](package.json)
[![types](https://img.shields.io/npm/types/french-sentences)](src/index.ts)
[![license](https://img.shields.io/npm/l/french-sentences)](LICENSE)

```ts
import { detectSentences } from "french-sentences";

detectSentences("M. Dupont est arrivé. Il dit : « Bonjour. » Puis il partit.");
// [ "M. Dupont est arrivé. ",
//   "Il dit : « Bonjour. » ",
//   "Puis il partit." ]
```

It is a spin-off of
[Palimpsest](https://william.revah.paris/en/stories/palimpsest), a writing tool
of mine. The tool was archived; this part seemed worth keeping, so I published
it on its own, for whoever needs it.

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
dialogue. Its limits — straight quotes, abbreviations outside its list,
`art. L. 123` — are stated plainly in [docs/behaviour.md](docs/behaviour.md).

## Install

```sh
npm install french-sentences
```

Node ≥ 20, ESM only, TypeScript types included, zero runtime dependencies.

## API

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

```ts
const text = "M. Dupont est arrivé. Il dit : « Bonjour. » Puis il partit.";

for (const s of detectSentences(text)) {
  console.log(s.start, s.end, s.text);
}
```

**Stability.** The signature is settled; `1.0.0` means that. Behaviour changes
to segmentation are treated as breaking and get a major bump, because a sentence
splitter that silently changes its output breaks its callers' stored offsets.

## Run locally

```sh
git clone https://github.com/w2ur/french-sentences.git
cd french-sentences
npm install
npm test            # builds with tsc, then runs the suite under node --test
npm run typecheck   # tsc --noEmit
```

No environment variables. Releases go to npm with `npm publish`, whose
`prepublishOnly` script runs the full test suite first; `npm pack --dry-run`
shows exactly what ships: the compiled `dist/src`, plus the README, licence
and `package.json` that npm always includes.

## Documentation

- [What it handles, what it does not, and performance](docs/behaviour.md)
- [Tests: the property tests and the regression discipline](docs/testing.md)

## Licence

MIT — see [LICENSE](LICENSE).

---

Made with care by [William](https://william.revah.paris)
