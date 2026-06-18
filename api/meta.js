// Vercel serverless function: GET /api/meta
// Returns selectable themes (name, count, emoji) and difficulty levels so the
// front-end start screen can populate itself.
const { getMeta } = require("./_lib/round.js");

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(JSON.stringify(getMeta()));
};
