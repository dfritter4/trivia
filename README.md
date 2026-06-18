# 💾 Totally Rad Trivia

A quick, mobile-first trivia game. Pull it up on everyone's phone, pick a
**theme** and **difficulty**, and race the clock.

**Live:** https://trivia-pi.vercel.app

- **Themes:** Millennial Nostalgia 💾, Marvel 🦸, Nature 🌿, USA 🇺🇸, Travel ✈️
- **Difficulty:** Easy / Medium / Hard / Any
- **Zero runtime dependencies** — plain Node.js + vanilla JS, no build step.
- **Mobile-first** retro/vaporwave UI with a CRT scanline vibe.
- Speed-bonus scoring, streak tracking, timer (or untimed) mode, and a
  randomized question + answer order every round.

## Play

Just open the live URL on any phone or computer — no Wi-Fi/LAN setup needed.
Bookmark it or "Add to Home Screen" for an app-like experience.

## Run it locally

You need [Node.js](https://nodejs.org) (v16+). Check with `node -v`.

```bash
node server.js          # http://localhost:3000  (PORT=8080 node server.js to change)
```

The local server and the deployed site share the exact same round logic
(`api/_lib/round.js`), so they behave identically.

## How scoring works

- **+100** points for each correct answer.
- **Speed bonus** (timed mode only): up to **+100** more for answering fast.
- **Streaks** are tracked and celebrated at 3+ in a row.

## Add or edit questions

All questions live in [`api/_data/questions.js`](./api/_data/questions.js).
Each entry looks like:

```js
{
  theme: "Marvel",        // selectable pack on the start screen
  category: "Marvel",     // short on-screen sub-tag
  difficulty: "easy",     // "easy" | "medium" | "hard"
  q: "What is Tony Stark's superhero alter ego?",
  choices: ["War Machine", "Iron Man", "Iron Patriot", "Vision"],
  answer: 1,              // 0-based index into `choices` — Iron Man
  fact: "Optional fun fact shown after answering."
}
```

Adding a question under a brand-new `theme` automatically makes that theme
appear on the start screen (counts come from `/api/meta`). To give a new theme
a custom emoji/order, add it to `THEME_META` in `api/_lib/round.js`.

Questions and answer positions are reshuffled on every round, so order is never
predictable. The question bank lives under `api/_data/` so answers are **not**
served as a static file.

## Architecture

```
trivia/
├── index.html            # screens: start / quiz / results (served at /)
├── styles.css            # retro vaporwave styling
├── game.js               # front-end game logic (vanilla JS)
├── api/
│   ├── round.js          # GET /api/round?theme=&difficulty=&count=
│   ├── meta.js           # GET /api/meta — themes + difficulties + counts
│   ├── _lib/round.js     # shared round-building/filtering logic
│   └── _data/questions.js# the question bank — edit this!
├── server.js             # local dev server (reuses _lib + _data)
└── vercel.json           # Vercel config
```

## Deploy

Deployed on [Vercel](https://vercel.com) as static files + serverless functions:

```bash
vercel deploy --prod
```
