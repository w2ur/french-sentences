# CLAUDE.md — french-sentences

## Project Overview

A small, focused TypeScript library: given a string of French text, split
it into sentences, correctly handling abbreviations, decimal numbers, and
`« … »` guillemet dialogue. See `README.md` for the full rationale.

## Tech Stack

- TypeScript, ESM (`"type": "module"`), Node ≥20
- **Zero runtime dependencies.** Do not add a runtime dependency without
  updating this file and the README to explain why.
- Build: `tsc` (see `tsconfig.json`; `rootDir` is the project root, so
  build output lands at `dist/src/` and `dist/test/`).

## User-Facing Language

English.

## Development

```sh
npm install
npm run build       # tsc -> dist/
npm run typecheck   # tsc --noEmit
npm test            # builds, then runs dist/test/ with node --test
```

## Testing

- `node --test`, the Node.js built-in runner. No test *framework* — the only
  test dependency is `fast-check`, for the property tests.
- Pure function, no I/O — tests call `detectSentences` directly with
  in-memory strings, nothing to stub.
- `test/sentences.test.ts` pins French behaviour by example;
  `test/sentences.property.test.ts` pins the contract (the ranges partition
  the input exactly) over arbitrary generated input, 1000 runs each.

## Project-Specific Rules

- **The algorithm in `src/sentences.ts` began as a verbatim extraction from an
  earlier desktop-writing app of the owner's, whose repo has since been
  deleted. That is history now, not a constraint.** On 2026-08-22 the owner
  explicitly authorised correcting it, and it was substantially rewritten:
  two-class abbreviations, span matching, single-pass quote depths. The rule
  it replaces said "do not rewrite its logic" and "treat a failing test as the
  authority, not as something to adjust until it passes" — **that rule is
  retired, and a future session must not restore the old behaviour on the
  strength of it.** What survives of its intent: there is still no upstream to
  compare against, so **this repo's tests remain the only specification**.
  Change behaviour deliberately and with a regression test, never as a
  side effect.
- **Every regression test was verified to fail against the previous
  implementation before being committed** (`git show <prev>:src/sentences.ts`
  swapped in, suite run, 7 of the new tests failed, implementation restored).
  Keep doing this — a test that has never produced the opposite answer is not
  evidence, and this suite is the whole specification.
- **Abbreviations are two classes, and the distinction is load-bearing.**
  `ABBREV_ALWAYS` (titles: `M.`, `Mme.`, `Dr.`…) can never end a sentence, so
  they guard unconditionally. `ABBREV_CONTEXTUAL` (`etc.`, `art.`, `p.`,
  `vol.`…) can, so they guard only when what follows is not a sentence start.
  **Do not collapse them back into one list.** A single unconditional list is
  what made `etc. Puis il partit.` one sentence and `l'art. Puis` unsplittable
  — the two bugs that motivated the rewrite. Adding an entry to
  `ABBREV_CONTEXTUAL` is cheap and low-risk; adding one to `ABBREV_ALWAYS`
  means asserting it is *never* sentence-final.
- **`ABBREVS` is sorted longest-first, and that ordering is required for
  correctness, not tidiness.** `av. J.-C.` must be matched in preference to the
  `av.` nested inside it, or the period after `J` is read as a boundary.
- **Known miss, documented in the README:** a contextual abbreviation followed
  by a capitalised proper noun splits where it should not (`art. L. 123`).
  Fixing it needs a notion of what follows an abbreviation beyond
  capitalisation; do not paper over it by moving entries into `ABBREV_ALWAYS`.
- **Straight double quotes (`"`) are deliberately not a quotation pair.** The
  same character opens and closes, so pairing them guesses. `« »` and `“ ”`
  are handled; this is a decision, not an omission.
- **Zero *runtime* dependencies.** Do not add one without updating this file
  and the README to explain why. `fast-check` is a devDependency for the
  property tests in `test/sentences.property.test.ts` and does not ship — the
  published tarball is `dist/src/`, `README.md`, `LICENSE` and
  `package.json`, verified with `npm pack --dry-run`.
- **This package IS published to npm** as `french-sentences`, public, since
  1.0.0 on 2026-08-22. The `"private": true` flag was removed with the owner's
  explicit sign-off. Segmentation output is part of the public contract:
  callers store `start`/`end` offsets, so **a behaviour change is a breaking
  change and takes a major bump**, not a patch.
- No `.nvmrc`, no `engines` pin above Node 24 — see the global CLAUDE.md
  policy on Vercel/Node compatibility (not that this repo deploys to
  Vercel, but the same ceiling applies portfolio-wide).
