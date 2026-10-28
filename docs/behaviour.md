# What French Sentences handles, and what it does not

Back to the [README](../README.md).

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
- **Abbreviations outside the list** are not recognised. The list —
  `ABBREV_ALWAYS` and `ABBREV_CONTEXTUAL` in
  [`src/sentences.ts`](../src/sentences.ts) — covers titles, citation and
  dating forms; domain-specific ones (medical, legal, military) are not
  included.
- **A contextual abbreviation followed by a capitalised proper noun** splits
  where it should not: `art. L. 123` reads the `L.` as a new sentence. Titles are
  exempt from this because they are in the always-guard class.
- **No sentence-level language detection.** It assumes its input is French. On
  English text it behaves like a slightly odd English splitter.

## Performance

One linear pass. Quote nesting depth is computed once up front rather than
rescanned per terminator, which matters on long documents.

A regression test (`quote scanning is linear, not quadratic, in the input
length` in [`test/sentences.test.ts`](../test/sentences.test.ts)) times the
same input at 1× and 8× its length and fails if the time grows anywhere near
quadratically — so a future change that reintroduces a per-terminator rescan
fails the suite rather than quietly costing seconds on a novel. No absolute
timings are published: they depend on the machine, and nothing in this
repository measures them reproducibly.
