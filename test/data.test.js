// Data-integrity tests for the question bank. These guard the things that make
// answers correct & usable: valid answer indices, no duplicate choices, no
// duplicate questions, and the expected theme/difficulty distribution.
const test = require("node:test");
const assert = require("node:assert/strict");

const { QUESTIONS } = require("../api/_data/questions.js");

const DIFFICULTIES = ["easy", "medium", "hard"];

test("every question has a non-empty theme and category", () => {
  for (const q of QUESTIONS) {
    assert.ok(typeof q.theme === "string" && q.theme.length, `missing theme: ${q.q}`);
    assert.ok(typeof q.category === "string" && q.category.length, `missing category: ${q.q}`);
  }
});

test("every question has a valid difficulty", () => {
  for (const q of QUESTIONS) {
    assert.ok(DIFFICULTIES.includes(q.difficulty), `bad difficulty "${q.difficulty}": ${q.q}`);
  }
});

test("every question has a non-empty prompt string", () => {
  for (const q of QUESTIONS) {
    assert.ok(typeof q.q === "string" && q.q.trim().length > 0, `empty prompt: ${JSON.stringify(q)}`);
  }
});

test("every question has at least 2 choices", () => {
  for (const q of QUESTIONS) {
    assert.ok(Array.isArray(q.choices) && q.choices.length >= 2, `too few choices: ${q.q}`);
  }
});

test("answer index is always within the choices range", () => {
  for (const q of QUESTIONS) {
    assert.ok(
      Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length,
      `answer ${q.answer} out of range for: ${q.q}`
    );
  }
});

test("no question has duplicate choices", () => {
  for (const q of QUESTIONS) {
    const set = new Set(q.choices.map((c) => c.trim().toLowerCase()));
    assert.equal(set.size, q.choices.length, `duplicate choice in: ${q.q}`);
  }
});

test("no duplicate questions within a theme", () => {
  const seen = new Set();
  for (const q of QUESTIONS) {
    const key = `${q.theme}|${q.q.trim().toLowerCase()}`;
    assert.ok(!seen.has(key), `duplicate question: ${q.q}`);
    seen.add(key);
  }
});

test("fact, when present, is a non-empty string", () => {
  for (const q of QUESTIONS) {
    if (q.fact !== undefined) {
      assert.ok(typeof q.fact === "string" && q.fact.length > 0, `bad fact: ${q.q}`);
    }
  }
});

test("the five expected themes are all present", () => {
  const themes = new Set(QUESTIONS.map((q) => q.theme));
  for (const expected of ["Millennial Nostalgia", "Marvel", "Nature", "USA", "Travel"]) {
    assert.ok(themes.has(expected), `missing theme: ${expected}`);
  }
});

test("each new theme has 30 questions, evenly split 10/10/10", () => {
  for (const theme of ["Marvel", "Nature", "USA", "Travel"]) {
    const inTheme = QUESTIONS.filter((q) => q.theme === theme);
    assert.equal(inTheme.length, 30, `${theme} should have 30 questions`);
    for (const diff of DIFFICULTIES) {
      const n = inTheme.filter((q) => q.difficulty === diff).length;
      assert.equal(n, 10, `${theme} should have 10 ${diff} questions, got ${n}`);
    }
  }
});

test("every theme has at least one question per offered scenario", () => {
  // Each theme must have at least a few questions so a round is never empty.
  const counts = {};
  for (const q of QUESTIONS) counts[q.theme] = (counts[q.theme] || 0) + 1;
  for (const [theme, n] of Object.entries(counts)) {
    assert.ok(n >= 5, `${theme} has only ${n} questions`);
  }
});
