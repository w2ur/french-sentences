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

- `node --test`, the Node.js built-in runner. No test framework dependency.
- Pure function, no I/O — tests call `detectSentences` directly with
  in-memory strings, nothing to stub.

## Project-Specific Rules

- **The algorithm in `src/sentences.ts` was extracted verbatim from an
  earlier desktop-writing app of the owner's, whose repo has since been
  deleted.** Do not rewrite its logic. There is no upstream left to
  compare against, so this repo's tests are now the only specification of
  the intended behaviour — treat a failing test as the authority, not as
  something to adjust until it passes. The only deliberate deviation from
  the original source is non-null assertions (`!`) at four already
  bounds-checked string-index reads, added to satisfy this repo's
  `noUncheckedIndexedAccess` tsconfig option (the source didn't enable
  it) — no behavioral change.
- The abbreviation guard only matches when a checked period is the *final*
  character of a listed abbreviation (see `FR_ABBREV` in
  `src/sentences.ts`). Compound abbreviations with an internal period
  (`av. J.-C.`) still split at that internal period — this is a known
  limitation of the source algorithm, not a bug to silently "fix" here.
  See the corresponding test in `test/sentences.test.ts` for the exact
  behavior.
- This package is **not published to npm** (`"private": true` in
  `package.json`, deliberately). Consumers install it directly from
  GitHub. Do not remove `"private": true` without the owner's explicit
  sign-off.
- No `.nvmrc`, no `engines` pin above Node 24 — see the global CLAUDE.md
  policy on Vercel/Node compatibility (not that this repo deploys to
  Vercel, but the same ceiling applies portfolio-wide).
