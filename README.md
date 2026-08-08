---
name: "french-sentences"
tagline_fr: "Segmentation de phrases françaises qui gère abréviations, virgules décimales et guillemets."
tagline_en: "French sentence segmentation that handles abbreviations, decimal commas and guillemets."
about_en: "French sentence segmentation that handles abbreviations, decimal commas and guillemets. Zero dependencies, TypeScript, ESM."
---

# french-sentences

A small, zero-dependency TypeScript module that splits French text into
sentences, correctly handling the things a naive `split(/[.!?]/)` gets
wrong: abbreviations, decimal numbers, and quoted dialogue.

## Why it exists

No npm package segments French this well. Generic sentence-splitters
(built for English, or language-agnostic) trip over:

- **Abbreviations** — `M. Dupont`, `Mme Martin`, `cf. p. 12`, `n° 5` all
  contain periods that are not sentence boundaries.
- **Decimal numbers** — `Il a 5.4 ans.` should not split at `5.4`.
- **Guillemets** — French dialogue uses `« … »`, not `"…"`. A period
  inside a quote should only close the sentence when the next
  non-whitespace character is the closing `»` — otherwise the whole
  quoted passage, however many sentences it contains, stays open.

`detectSentences` handles all three, with zero runtime dependencies.

## Known limitation

The abbreviation guard only fires when the period being tested is the
**final** character of a listed abbreviation. Compound abbreviations that
contain an internal period — `av. J.-C.`, `apr. J.-C.` — are still split
at that internal period, so `Il est né av. J.-C. selon la légende.`
yields three ranges rather than one. This is the behaviour of the
extracted algorithm and is covered by a test that asserts the true
output; it is documented here rather than silently patched.

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

## Tests

`npm test` builds, then runs 15 tests under `node --test` — the Node
built-in runner, no test-framework dependency. The suite is pure:
`detectSentences` takes a string and returns offsets, so there is nothing
to stub and no I/O to mock.

The compound-abbreviation limitation described above has its own test,
which asserts the behaviour the code actually has rather than the
behaviour it ought to have. That is deliberate — the day someone fixes it,
that test fails and tells them what they changed.

## Stability

`detectSentences` is the entire public API, and its signature is settled.
The package is versioned `0.1.0` and installed from a git ref rather than
npm, so pin a commit if you need reproducible builds.

---

Made with care by [William](https://william.revah.paris)
