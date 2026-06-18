// Tests for the Vercel serverless handlers (api/round.js, api/meta.js).
// These are plain (req, res) functions, so we drive them with lightweight mocks.
const test = require("node:test");
const assert = require("node:assert/strict");

const roundHandler = require("../api/round.js");
const metaHandler = require("../api/meta.js");

// Minimal mock of the Vercel/Node response object the handlers use.
function mockRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json() {
      return JSON.parse(this.body);
    },
  };
}

test("GET /api/meta returns themes, difficulties and total", () => {
  const res = mockRes();
  metaHandler({ query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
  const data = res.json();
  assert.ok(Array.isArray(data.themes) && data.themes.length === 5);
  assert.deepEqual(data.difficulties, ["easy", "medium", "hard"]);
  assert.ok(Number.isInteger(data.total) && data.total > 0);
});

test("GET /api/round honors theme + difficulty + count", () => {
  const res = mockRes();
  roundHandler({ query: { theme: "Marvel", difficulty: "easy", count: "4" } }, res);
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.count, 4);
  assert.equal(data.questions.length, 4);
  assert.ok(data.questions.every((q) => q.theme === "Marvel" && q.difficulty === "easy"));
});

test("GET /api/round sets a no-store cache header", () => {
  const res = mockRes();
  roundHandler({ query: { theme: "USA" } }, res);
  assert.equal(res.headers["cache-control"], "no-store");
});

test("GET /api/round with no query still returns a valid (default) round", () => {
  const res = mockRes();
  roundHandler({ query: {} }, res);
  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.count, 10); // default count, no theme filter
  assert.equal(data.questions.length, 10);
});

test("GET /api/round tolerates a missing query object", () => {
  const res = mockRes();
  roundHandler({}, res); // req.query undefined
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().questions.length > 0);
});
