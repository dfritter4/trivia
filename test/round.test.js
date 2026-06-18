// Unit tests for the shared round logic (api/_lib/round.js).
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildRound, getMeta, filterQuestions, DIFFICULTIES } = require("../api/_lib/round.js");
const { QUESTIONS } = require("../api/_data/questions.js");

// Map an original question prompt -> its correct answer TEXT, so we can verify
// the shuffled round still points at the right option.
const correctTextByPrompt = new Map(
  QUESTIONS.map((q) => [q.q, q.choices[q.answer]])
);

test("getMeta returns themes sorted in the intended display order", () => {
  const meta = getMeta();
  const names = meta.themes.map((t) => t.name);
  assert.deepEqual(names, ["Millennial Nostalgia", "Marvel", "Nature", "USA", "Travel"]);
});

test("getMeta theme counts match the underlying data", () => {
  const meta = getMeta();
  for (const t of meta.themes) {
    const actual = QUESTIONS.filter((q) => q.theme === t.name).length;
    assert.equal(t.count, actual, `count mismatch for ${t.name}`);
    assert.ok(typeof t.emoji === "string" && t.emoji.length, `missing emoji for ${t.name}`);
  }
});

test("getMeta reports difficulties and a correct total", () => {
  const meta = getMeta();
  assert.deepEqual(meta.difficulties, DIFFICULTIES);
  assert.equal(meta.total, QUESTIONS.length);
});

test("filterQuestions filters by theme", () => {
  const marvel = filterQuestions({ theme: "Marvel" });
  assert.ok(marvel.length > 0);
  assert.ok(marvel.every((q) => q.theme === "Marvel"));
});

test("filterQuestions filters by difficulty", () => {
  const easy = filterQuestions({ difficulty: "easy" });
  assert.ok(easy.length > 0);
  assert.ok(easy.every((q) => q.difficulty === "easy"));
});

test("filterQuestions combines theme + difficulty", () => {
  const res = filterQuestions({ theme: "USA", difficulty: "hard" });
  assert.equal(res.length, 10);
  assert.ok(res.every((q) => q.theme === "USA" && q.difficulty === "hard"));
});

test("filterQuestions ignores an invalid difficulty (treats as 'any')", () => {
  const all = filterQuestions({ theme: "Nature" });
  const bogus = filterQuestions({ theme: "Nature", difficulty: "expert" });
  assert.equal(bogus.length, all.length);
});

test("filterQuestions treats null/'any' difficulty as no filter", () => {
  const a = filterQuestions({ theme: "Travel", difficulty: null });
  const b = filterQuestions({ theme: "Travel", difficulty: "any" });
  assert.equal(a.length, 30);
  assert.equal(b.length, 30);
});

test("unknown theme yields an empty round", () => {
  const r = buildRound({ count: 10, theme: "Nonexistent" });
  assert.equal(r.count, 0);
  assert.equal(r.questions.length, 0);
  assert.equal(r.available, 0);
});

test("buildRound respects the requested count", () => {
  const r = buildRound({ count: 5, theme: "Marvel" });
  assert.equal(r.count, 5);
  assert.equal(r.questions.length, 5);
});

test("buildRound caps count at the number available", () => {
  const r = buildRound({ count: 999, theme: "USA", difficulty: "easy" });
  assert.equal(r.available, 10);
  assert.equal(r.count, 10);
  assert.equal(r.questions.length, 10);
});

test("buildRound defaults to 10 when count is missing/invalid", () => {
  assert.equal(buildRound({ theme: "Marvel" }).count, 10);
  assert.equal(buildRound({ count: 0, theme: "Marvel" }).count, 10);
  assert.equal(buildRound({ count: -3, theme: "Marvel" }).count, 10);
  assert.equal(buildRound({ count: NaN, theme: "Marvel" }).count, 10);
});

test("buildRound only returns questions matching the requested filters", () => {
  const r = buildRound({ count: 10, theme: "Nature", difficulty: "medium" });
  assert.ok(r.questions.length > 0);
  assert.ok(r.questions.every((q) => q.theme === "Nature" && q.difficulty === "medium"));
});

test("CRITICAL: after shuffling, answer index still points at the correct option", () => {
  // Run many randomized rounds across every theme so the shuffle is exercised.
  const themes = getMeta().themes.map((t) => t.name);
  for (let iter = 0; iter < 40; iter++) {
    for (const theme of themes) {
      const r = buildRound({ count: 30, theme });
      for (const q of r.questions) {
        const expectedText = correctTextByPrompt.get(q.q);
        assert.ok(expectedText !== undefined, `unknown prompt leaked: ${q.q}`);
        assert.equal(
          q.choices[q.answer],
          expectedText,
          `remap broke for "${q.q}": index ${q.answer} -> "${q.choices[q.answer]}" but correct is "${expectedText}"`
        );
      }
    }
  }
});

test("buildRound preserves all original choices (just reordered)", () => {
  for (let iter = 0; iter < 20; iter++) {
    const r = buildRound({ count: 30, theme: "Travel" });
    for (const q of r.questions) {
      const original = QUESTIONS.find((o) => o.q === q.q);
      assert.deepEqual(
        [...q.choices].sort(),
        [...original.choices].sort(),
        `choices changed for: ${q.q}`
      );
    }
  }
});

test("buildRound assigns sequential ids starting at 0", () => {
  const r = buildRound({ count: 8, theme: "Marvel" });
  assert.deepEqual(r.questions.map((q) => q.id), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test("buildRound does not repeat a question within one round", () => {
  for (let iter = 0; iter < 20; iter++) {
    const r = buildRound({ count: 30, theme: "USA" });
    const prompts = r.questions.map((q) => q.q);
    assert.equal(new Set(prompts).size, prompts.length, "duplicate question within a round");
  }
});
