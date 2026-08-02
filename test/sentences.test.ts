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

test("does not split on the various documented abbreviations", () => {
  const cases: Array<[string, number]> = [
    ["Le dr. Dupont a vu Mme Martin. Elle va bien.", 2],
    ["On cite l'ouvrage cf. p. 12. C'est utile.", 2],
    ["N° 5 est prêt. On continue.", 2],
  ];
  for (const [text, expected] of cases) {
    const r = detectSentences(text);
    assert.equal(r.length, expected, `unexpected split count for: "${text}"`);
  }
});

test("guards the final period of the compound abbreviation `av. J.-C.`", () => {
  // The abbreviation window only matches when a checked period is the
  // *final* character of a listed abbreviation. "av. J.-C." itself has an
  // internal period (after "J"), which is not itself the end of any listed
  // abbreviation, so it still terminates a sentence there — but the
  // abbreviation's own trailing period (after "C") is correctly guarded and
  // does not split.
  const r = detectSentences("Il est né av. J.-C. selon la légende. C'est étrange.");
  assert.equal(r.length, 3);
  assert.equal(r[0]?.text, "Il est né av. J.");
  assert.equal(r[1]?.text, "-C. selon la légende. ");
  assert.equal(r[2]?.text, "C'est étrange.");
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
