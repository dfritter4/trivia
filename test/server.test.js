// Integration tests for the local dev server (server.js): real HTTP requests
// against the actual handler, on an ephemeral port.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { handler } = require("../server.js");

let server;
let base;

test.before(async () => {
  server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

async function get(path) {
  const res = await fetch(base + path);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON (static asset) */
  }
  return { status: res.status, headers: res.headers, text, json };
}

test("GET / serves the HTML page", async () => {
  const r = await get("/");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/html/);
  assert.match(r.text, /Totally Rad/);
});

test("GET /styles.css and /game.js serve with correct content types", async () => {
  const css = await get("/styles.css");
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type"), /text\/css/);

  const js = await get("/game.js");
  assert.equal(js.status, 200);
  assert.match(js.headers.get("content-type"), /javascript/);
});

test("GET /api/meta returns themes JSON", async () => {
  const r = await get("/api/meta");
  assert.equal(r.status, 200);
  assert.ok(r.json && Array.isArray(r.json.themes) && r.json.themes.length === 5);
});

test("GET /api/round filters by theme and difficulty", async () => {
  const r = await get("/api/round?theme=Nature&difficulty=hard&count=3");
  assert.equal(r.status, 200);
  assert.equal(r.json.count, 3);
  assert.ok(r.json.questions.every((q) => q.theme === "Nature" && q.difficulty === "hard"));
});

test("GET /api/health reports ok with a total", async () => {
  const r = await get("/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.ok(Number.isInteger(r.json.total) && r.json.total > 0);
});

test("server does NOT expose the question bank source file", async () => {
  // The answers live under api/_data — they must never be served statically.
  const r = await get("/api/_data/questions.js");
  assert.equal(r.status, 404);
});

test("unknown static paths return 404", async () => {
  const r = await get("/secret.txt");
  assert.equal(r.status, 404);
});

test("path-traversal attempts are not served", async () => {
  const r = await get("/../server.js");
  assert.notEqual(r.status, 200);
});
