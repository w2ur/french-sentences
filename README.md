---
name: "french-sentences"
tagline_fr: "Segmentation de phrases françaises qui gère abréviations, virgules décimales et guillemets."
tagline_en: "French sentence segmentation that handles abbreviations, decimal commas and guillemets."
---

# french-sentences

A small, zero-dependency TypeScript module that splits French text into
sentences, correctly handling the things a naive `split(/[.!?]/)` gets
wrong: abbreviations, decimal numbers, and quoted dialogue.

## Why it exists

No npm package segments French this well. Generic sentence-splitters
(built for English, or language-agnostic) trip over:

- **Abbreviations** — `M. Dupont`, `Mme Martin`, `cf. p. 12`, `n° 5`,
  `av. J.-C.` all contain periods that are not sentence boundaries.
- **Decimal numbers** — `Il a 5.4 ans.` should not split at `5.4`.
- **Guillemets** — French dialogue uses `« … »`, not `"…"`. A period
  inside a quote should only close the sentence when the next
  non-whitespace character is the closing `»` — otherwise the whole
  quoted passage, however many sentences it contains, stays open.

`detectSentences` handles all three, with zero runtime dependencies.

## Install

Not published to npm. Install directly from GitHub:

```sh
npm install github:w2ur/french-sentences
```

or clone it and `npm run build` to get a local `dist/`.

## Usage

```ts
import { detectSentences } from "french-sentences";

const sentences = detectSentences(
  "M. Dupont est arrivé. Il dit : « Bonjour. » Puis il partit."
);

for (const s of sentences) {
  console.log(s.text);
  // { start, end, text } — start/end are character offsets into the
  // original string, so text === original.slice(start, end).
}
```

`detectSentences(text: string): SentenceRange[]` where
`SentenceRange = { start: number; end: number; text: string }`.

## Provenance

Extracted from
[`w2ur/palimpseste-nacre`](https://github.com/w2ur/palimpseste-nacre)'s
`src/model/sentences.ts`, before that repo was archived. The algorithm is
unchanged; this package generalizes the module out of the desktop-writing
app it was built for and gives it its own build, tests, and repo.
