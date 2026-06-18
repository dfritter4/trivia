// Shared trivia round logic — used by both the local dev server (server.js)
// and the Vercel serverless functions (api/round.js, api/meta.js).
// Single source of truth so local and production behave identically.

const { QUESTIONS } = require("../_data/questions.js");

const DIFFICULTIES = ["easy", "medium", "hard"];

// Display order + emoji for each theme. Themes are otherwise derived from the
// data, so adding questions for a new theme automatically surfaces it.
const THEME_META = {
  "Millennial Nostalgia": { emoji: "💾", order: 0 },
  Marvel: { emoji: "🦸", order: 1 },
  Nature: { emoji: "🌿", order: 2 },
  USA: { emoji: "🇺🇸", order: 3 },
  Travel: { emoji: "✈️", order: 4 },
};

// Fisher-Yates shuffle (non-mutating).
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeDifficulty(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  return DIFFICULTIES.includes(v) ? v : null;
}

// Filter the bank by theme and/or difficulty. A null/"any"/missing value for a
// field means "don't filter on it".
function filterQuestions({ theme, difficulty }) {
  const diff = normalizeDifficulty(difficulty);
  return QUESTIONS.filter((item) => {
    if (theme && item.theme !== theme) return false;
    if (diff && item.difficulty !== diff) return false;
    return true;
  });
}

// Build a fresh randomized round. Shuffles the question order and the choices
// within each question (remapping the answer index) so nothing is predictable.
function buildRound({ count, theme, difficulty }) {
  const pool = filterQuestions({ theme, difficulty });
  const requested = Number.isFinite(count) && count > 0 ? count : 10;
  const picked = shuffle(pool).slice(0, Math.min(requested, pool.length));

  const questions = picked.map((item, idx) => {
    const order = shuffle(item.choices.map((_, i) => i));
    const choices = order.map((i) => item.choices[i]);
    const answer = order.indexOf(item.answer);
    return {
      id: idx,
      theme: item.theme,
      category: item.category,
      difficulty: item.difficulty,
      q: item.q,
      choices,
      answer,
      fact: item.fact || null,
    };
  });

  return { count: questions.length, available: pool.length, questions };
}

// Metadata for the UI: the list of selectable themes (with counts + emoji) and
// the available difficulty levels.
function getMeta() {
  const counts = {};
  for (const item of QUESTIONS) {
    counts[item.theme] = (counts[item.theme] || 0) + 1;
  }
  const themes = Object.keys(counts)
    .map((name) => ({
      name,
      count: counts[name],
      emoji: (THEME_META[name] || {}).emoji || "🎯",
      order: (THEME_META[name] || {}).order ?? 999,
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(({ name, count, emoji }) => ({ name, count, emoji }));

  return { themes, difficulties: DIFFICULTIES, total: QUESTIONS.length };
}

module.exports = { buildRound, getMeta, filterQuestions, DIFFICULTIES };
