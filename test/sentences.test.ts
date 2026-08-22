import { test } from "node:test";
import assert from "node:assert/strict";
import { detectSentences } from "../src/sentences.js";

test("returns empty for empty string", () => {
  assert.deepEqual(detectSentences(""), []);
});

test("splits two simple sentences", () => {
  const r = detectSentences("Bonjour. Au revoir.");
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], { start: 0, end: 9, text: "Bonjour. " });
  assert.deepEqual(r[1], { start: 9, end: 19, text: "Au revoir." });
});

test("does not split on French abbreviations", () => {
  const r = detectSentences("M. Dupont est arrivé. Mme Martin l'attendait.");
  assert.equal(r.length, 2);
  assert.equal(r[0]?.text, "M. Dupont est arrivé. ");
  assert.equal(r[1]?.text, "Mme Martin l'attendait.");
});

test("handles question and exclamation marks", () => {
  const r = detectSentences("Vraiment ? Oui ! Bien sûr.");
  assert.equal(r.length, 3);
  assert.deepEqual(
    r.map((s) => s.text.trim()),
    ["Vraiment ?", "Oui !", "Bien sûr."]
  );
});

test("handles ellipsis followed by capital letter", () => {
  const r = detectSentences("Il pensa… Puis il parla.");
  assert.equal(r.length, 2);
});

test("does not split inside « » quoted dialogue", () => {
  const r = detectSentences("Il dit : « Bonjour. » Puis il partit.");
  assert.equal(r.length, 2);
  assert.ok(r[0]?.text.includes("« Bonjour. »"));
});

test("ignores trailing decimals in numbers", () => {
  const r = detectSentences("Il a 5.4 ans. Vraiment.");
  assert.equal(r.length, 2);
  assert.equal(r[0]?.text, "Il a 5.4 ans. ");
});

test("returns one sentence when no terminator", () => {
  const r = detectSentences("Sans fin");
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { start: 0, end: 8, text: "Sans fin" });
});

test("offsets are stable: text.slice(start, end) === sentence.text", () => {
  const text = "Première phrase. Deuxième.";
  const r = detectSentences(text);
  for (const s of r) assert.equal(text.slice(s.start, s.end), s.text);
});

// Additional coverage for every documented behaviour.

test("does not split on abbreviations that are never sentence-final", () => {
  // Each case below contains a period *inside* the abbreviation, so the guard
  // is genuinely exercised. (An earlier version of this test used "Mme Martin"
  // and "N° 5", neither of which contains a period — they passed for free.)
  const cases: Array<[string, number]> = [
    ["Le Dr. Dupont a vu Mme. Martin. Elle va bien.", 2],
    ["On cite l'ouvrage cf. p. 12. C'est utile.", 2],
    ["Me. Durand plaidera. On verra.", 2],
  ];
  for (const [text, expected] of cases) {
    assert.equal(detectSentences(text).length, expected, `unexpected split count for: "${text}"`);
  }

  // Control: the guard must not fire on an ordinary word that merely ends in
  // the same letters. Without this, the assertions above could pass because the
  // splitter never splits anything.
  assert.equal(detectSentences("Il monta au sommet du cap. Puis il redescendit.").length, 2);
  assert.equal(detectSentences("Il résolut le problème. Puis il partit.").length, 2);
});

test("splits compound abbreviations correctly (`av. J.-C.`)", () => {
  // Regression: b7de92e — the abbreviation guard only matched when the checked
  // period was the *final* character of a listed abbreviation, so the internal
  // period of `av. J.-C.` split the sentence. Matching now spans the whole
  // abbreviation, so an internal period is never a boundary.
  const r = detectSentences("Il est né av. J.-C. selon la légende. C'est étrange.");
  assert.equal(r.length, 2);
  assert.equal(r[0]?.text, "Il est né av. J.-C. selon la légende. ");
  assert.equal(r[1]?.text, "C'est étrange.");

  // The abbreviation's own trailing period still closes a sentence when what
  // follows begins one.
  const ends = detectSentences("Il est mort en 44 av. J.-C. Puis Rome changea.");
  assert.equal(ends.length, 2);
  assert.equal(ends[0]?.text, "Il est mort en 44 av. J.-C. ");
});

test("does not split on a decimal dot between digits (French decimal-comma text still uses dots for some numbers)", () => {
  const r = detectSentences("Le prix est de 3.14 euros. C'est cher.");
  assert.equal(r.length, 2);
  assert.equal(r[0]?.text, "Le prix est de 3.14 euros. ");

  // A period is only protected when digits sit on both sides; a trailing
  // period after a number followed by a word is a real terminator.
  const notProtected = detectSentences("Il a payé 3. C'est peu.");
  assert.equal(notProtected.length, 2);
});

test("a period inside « » only closes the sentence when the closing » follows", () => {
  const insideNoClose = detectSentences("Il dit : « Il pensa. Il resta. » Fin.");
  // The first period is followed by more quoted text, not the closing »,
  // so it is not a boundary; the whole quote stays one sentence.
  assert.equal(insideNoClose.length, 2);
  assert.ok(insideNoClose[0]?.text.includes("« Il pensa. Il resta. »"));

  const closesWithGuillemet = detectSentences("Il dit : « Bonjour. » Il partit.");
  assert.equal(closesWithGuillemet.length, 2);
  assert.ok(closesWithGuillemet[0]?.text.trim().endsWith("»"));
});

test("returns one sentence when the text has no terminator at all", () => {
  const r = detectSentences("Aucune ponctuation ici");
  assert.equal(r.length, 1);
  assert.equal(r[0]?.text, "Aucune ponctuation ici");
});

test("handles runs of terminators as a single boundary", () => {
  const r = detectSentences("Quoi ?! Vraiment… Oui.");
  assert.equal(r.length, 3);
  assert.deepEqual(
    r.map((s) => s.text.trim()),
    ["Quoi ?!", "Vraiment…", "Oui."]
  );
});

// --- Regression tests for the 2026-08-22 correctness pass ---

test("an abbreviation that can also end a sentence is resolved by what follows", () => {
  // Regression: b7de92e — `etc.` was guarded unconditionally, so it swallowed
  // the sentence after it. Contextual abbreviations now split when a new
  // sentence appears to begin, and hold when a digit or lowercase word follows.
  const swallowed = detectSentences("Il a acheté des pommes, des poires, etc. Puis il partit.");
  assert.equal(swallowed.length, 2);
  assert.equal(swallowed[0]?.text, "Il a acheté des pommes, des poires, etc. ");

  // …but the same abbreviation mid-citation still holds the sentence open.
  assert.equal(detectSentences("Voir art. 5 du code. C'est clair.").length, 2);
  assert.equal(detectSentences("Le vol. 3 est paru. Fin.").length, 2);
  assert.equal(detectSentences("Voir le tableau fig. 3. Il est clair.").length, 2);
});

test("common French words that are also abbreviations are not guarded", () => {
  // Regression: b7de92e — `art.`, `ex.`, `vol.` and `ch.` were guarded
  // unconditionally, and the apostrophe counted as a word boundary, so
  // "l'art." never closed a sentence.
  const cases = [
    "Il aime l'art. Puis il partit.",
    "Il aime beaucoup l'art. Fin.",
    "Elle a revu son ex. Puis elle partit.",
    "Le vol. Puis l'atterrissage.",
  ];
  for (const text of cases) {
    assert.equal(detectSentences(text).length, 2, `should split: "${text}"`);
  }
});

test("titles are guarded regardless of what follows", () => {
  // A title is always followed by a name, which is capitalised — so the
  // contextual rule must not apply to them.
  assert.equal(detectSentences("M. Dupont est arrivé. Il partit.").length, 2);
  assert.equal(detectSentences("Le Dr. Martin arriva. Fin.").length, 2);
  assert.equal(detectSentences("MM. Dupont et Durand sont là. Fin.").length, 2);
});

test("an unmatched « does not swallow the rest of the text", () => {
  // Regression: b7de92e — quote depth counted every « as opening a span, so a
  // stray or unbalanced guillemet made the remainder of the document a single
  // sentence. Only *matched* pairs count now.
  const r = detectSentences("Il dit : « Bonjour. Puis il partit. Encore une phrase.");
  assert.equal(r.length, 3);

  // Control: a balanced pair still holds its contents together.
  assert.equal(detectSentences("Il dit : « Bonjour. Puis il partit. » Fin.").length, 2);
});

test("curly double quotes are handled like guillemets", () => {
  // Regression: b7de92e — only « » were recognised, so “Bonjour.” split after
  // the period and left the closing ” at the head of the next sentence.
  const r = detectSentences("Il dit : “Bonjour.” Puis il partit.");
  assert.equal(r.length, 2);
  assert.equal(r[0]?.text, "Il dit : “Bonjour.” ");
  assert.equal(r[1]?.text, "Puis il partit.");
});

test("quote scanning is linear, not quadratic, in the input length", () => {
  // Regression: b7de92e — isInsideGuillemets rescanned from index 0 for every
  // terminator, so quote-heavy text was O(n²): 88k chars took ~286 ms. Depths
  // are now computed once, in a single pass.
  const unit = "Il dit : « Bonjour. » ";
  const time = (n: number): number => {
    const text = unit.repeat(n);
    detectSentences(text); // warm up
    const t0 = process.hrtime.bigint();
    detectSentences(text);
    return Number(process.hrtime.bigint() - t0) / 1e6;
  };
  const small = time(1000);
  const large = time(8000);
  // 8x the input. Quadratic would be ~64x; linear is ~8x. Allow generous
  // headroom for a noisy CI machine while still failing on a return to O(n²).
  assert.ok(
    large < Math.max(small * 20, 50),
    `expected roughly linear scaling, got ${small.toFixed(1)}ms -> ${large.toFixed(1)}ms`
  );
});

test("decimal points hold, and French decimal commas need no guard", () => {
  // A comma is not a terminator, so `5,4` was never at risk — the guard exists
  // for `5.4`, which French also uses for version and measurement notation.
  assert.equal(detectSentences("Il a payé 5,4 euros. C'est cher.").length, 2);
  assert.equal(detectSentences("Il a payé 5.4 euros. C'est cher.").length, 2);
  assert.equal(detectSentences("Il a payé 3. C'est peu.").length, 2);
});
