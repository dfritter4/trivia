#!/usr/bin/env node
// Trivia — zero-dependency local dev server.
// Run with: node server.js   (optionally PORT=8080 node server.js)
// Binds to 0.0.0.0 so phones on the same Wi-Fi can reach it by your Mac's IP.
//
// Production runs on Vercel as serverless functions (see api/). This server and
// those functions share the exact same round logic in api/_lib/round.js, so
// local and deployed behavior are identical.

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { buildRound, getMeta } = require("./api/_lib/round.js");

const PORT = process.env.PORT || 3000;

// Static assets live at the repo root (so Vercel serves them at /). We serve an
// explicit allowlist locally so server-side source files are never exposed.
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/game.js": { file: "game.js", type: "text/javascript; charset=utf-8" },
};

function sendJSON(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const entry = STATIC_FILES[urlPath];
  if (!entry) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  fs.readFile(path.join(__dirname, entry.file), (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": entry.type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/api/round") {
    const params = new URL(req.url, "http://localhost").searchParams;
    const round = buildRound({
      count: parseInt(params.get("count"), 10),
      theme: params.get("theme"),
      difficulty: params.get("difficulty"),
    });
    return sendJSON(res, 200, round);
  }

  if (url === "/api/meta") {
    return sendJSON(res, 200, getMeta());
  }

  if (url === "/api/health") {
    return sendJSON(res, 200, { ok: true, total: getMeta().total });
  }

  return serveStatic(req, res);
});

// Find non-internal IPv4 addresses (your LAN IPs) so phones can connect.
function getLanIPs() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

server.listen(PORT, "0.0.0.0", () => {
  const meta = getMeta();
  const ips = getLanIPs();
  console.log("\n  🎮  Trivia is live!\n");
  console.log(`     On this Mac:   http://localhost:${PORT}`);
  if (ips.length) {
    console.log("     On your phone (same Wi-Fi):");
    ips.forEach((ip) => console.log(`        http://${ip}:${PORT}`));
  } else {
    console.log("     (No LAN IP detected — check your Wi-Fi connection.)");
  }
  console.log(
    `\n     ${meta.total} questions across ${meta.themes.length} themes. Press Ctrl+C to stop.\n`
  );
});
