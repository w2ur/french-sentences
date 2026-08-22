import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { detectSentences } from "../src/sentences.js";

/**
 * `detectSentences` is a pure transform from a string to a partition of that
 * string. These properties hold for *every* input, so they are the strongest
 * statement the suite makes: the example tests pin French behaviour, these pin
 * the contract.
 */

/** Fragments biased towards the constructs the splitter reasons about. */
const fragment = fc.oneof(
  fc.constantFrom(
    "M.", "Mme.", "etc.", "cf.", "p.", "art.", "av. J.-C.", "vol.", "fig.",
    "«", "»", "“", "”", ".", "!", "?", "…", "?!", "...",
    "Bonjour", "il partit", "Le prix", "5.4", "3,14", "12",
    " ", "  ", "\n", "\t", "'", "’", "-", ":", ",", "(", ")"
  ),
  fc.string({ minLength: 0, maxLength: 8 })
);

const frenchish = fc
  .array(fragment, { minLength: 0, maxLength: 40 })
  .map((parts) => parts.join(""));

const RUNS = { numRuns: 1000 };

test("property: the ranges partition the input exactly", () => {
  fc.assert(
    fc.property(frenchish, (text) => {
      const r = detectSentences(text);
      assert.equal(r.map((s) => s.text).join(""), text);
    }),
    RUNS
  );
});

test("property: offsets are contiguous, ordered and cover the whole input", () => {
  fc.assert(
    fc.property(frenchish, (text) => {
      const r = detectSentences(text);
      if (text.length === 0) {
        assert.equal(r.length, 0);
        return;
      }
      assert.equal(r[0]?.start, 0);
      assert.equal(r[r.length - 1]?.end, text.length);
      for (let i = 0; i < r.length; i++) {
        const s = r[i]!;
        assert.ok(s.end > s.start, "no empty range");
        if (i > 0) assert.equal(s.start, r[i - 1]!.end, "no gap and no overlap");
      }
    }),
    RUNS
  );
});

test("property: every range's text is the slice its offsets describe", () => {
  fc.assert(
    fc.property(frenchish, (text) => {
      for (const s of detectSentences(text)) {
        assert.equal(text.slice(s.start, s.end), s.text);
      }
    }),
    RUNS
  );
});

test("property: the result is deterministic", () => {
  fc.assert(
    fc.property(frenchish, (text) => {
      assert.deepEqual(detectSentences(text), detectSentences(text));
    }),
    RUNS
  );
});
