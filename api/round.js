// Vercel serverless function: GET /api/round
// Query params: count (number), theme (string), difficulty (easy|medium|hard|any)
const { buildRound } = require("./_lib/round.js");

module.exports = (req, res) => {
  const { count, theme, difficulty } = req.query || {};
  const parsedCount = parseInt(count, 10);
  const round = buildRound({
    count: parsedCount,
    theme: theme || null,
    difficulty: difficulty || null,
  });

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(JSON.stringify(round));
};
