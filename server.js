// ===== Câu Cá 2D — Cloud server (Node.js) =====
// Chức năng y hệt server.ps1: phục vụ file tĩnh + API cho admin xem/điều khiển người chơi.
// Chạy được trên Render / Railway / Glitch... để game online 24/7 không cần bật máy tính.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

// ----- Bộ nhớ tạm (reset khi server khởi động lại) -----
const players = {};      // id -> { ...info, lastSeen }
const cmdQueue = {};     // id -> ["cmd:val", ...]
const bridgeScores = {}; // id -> { ...score }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.woff2':'font/woff2',
  '.txt':  'text/plain; charset=utf-8',
};

function now() { return Math.floor(Date.now() / 1000); }

function sendJson(res, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function handleApi(pathname, query, res) {
  if (pathname === '/api/ping') {
    const id = query.id;
    if (id) {
      players[id] = {
        id,
        name:   query.name || '',
        money:  parseInt(query.money) || 0,
        caught: parseInt(query.caught) || 0,
        world:  query.world || '',
        rod:    query.rod || '',
        bait:   query.bait || '',
        lastSeen: now(),
      };
    }
    return sendJson(res, { ok: true });
  }

  if (pathname === '/api/players') {
    const t = now();
    for (const k of Object.keys(players)) {
      if (t - players[k].lastSeen > 30) delete players[k]; // bỏ người offline >30s
    }
    return sendJson(res, Object.values(players));
  }

  if (pathname === '/api/cmd') {
    const target = query.target, cmd = query.cmd, val = query.val || '';
    if (target && cmd) {
      if (!cmdQueue[target]) cmdQueue[target] = [];
      cmdQueue[target].push(cmd + ':' + val);
    }
    return sendJson(res, { ok: true });
  }

  if (pathname === '/api/mycmd') {
    const id = query.id;
    let list = [];
    if (id && cmdQueue[id]) { list = cmdQueue[id]; cmdQueue[id] = []; }
    return sendJson(res, list);
  }

  if (pathname === '/api/bridge_score') {
    const id = query.id;
    if (id) {
      bridgeScores[id] = {
        id, name: query.name || '',
        score: parseInt(query.score) || 0,
        level: parseInt(query.level) || 1,
        ts: now(),
      };
    }
    return sendJson(res, { ok: true });
  }

  if (pathname === '/api/bridge_top') {
    const sorted = Object.values(bridgeScores)
      .sort((a, b) => b.score - a.score).slice(0, 20);
    return sendJson(res, sorted);
  }

  return sendJson(res, { error: 'unknown' });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname);

  // API routes
  if (pathname.indexOf('/api/') === 0) {
    return handleApi(pathname, parsed.query, res);
  }

  // Static files
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  // Chặn path traversal
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safe);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 - ' + safe + ' not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Cau Ca 2D cloud server running on port ' + PORT);
});
