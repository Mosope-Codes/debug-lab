'use strict';
// Debug Lab server. No dependencies. Run: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT_MAIN = 3000;
const PORT_OTHER = 3001;

function json(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers));
  res.end(JSON.stringify(body));
}

let cachedVersion = 0;

function handleApi(req, res, port, url) {
  const p = url.pathname;

  if (port === PORT_OTHER) {
    if (p === '/api/stats') return json(res, 200, { activeSessions: 42 });
    // if (p === '/api/stats') return json(res, 200, { activeSessions: 42 }, { 'Access-Control-Allow-Origin': 'http://localhost:' + PORT_MAIN });
    if (p === '/api/stats-ok') {
      return json(res, 200, { activeSessions: 42 }, { 'Access-Control-Allow-Origin': 'http://localhost:' + PORT_MAIN });
    }
    return json(res, 404, { error: 'Not found', path: p });
  }

  switch (p) {
    // case '/api/users':
    case '/api/user':
      return json(res, 200, [{ id: 1, name: 'Ada' }, { id: 2, name: 'Tunde' }, { id: 3, name: 'Zainab' }]);
    case '/api/orders':
      return setTimeout(() => json(res, 200, { count: 128, revenue: 42500 }), 2500);
    case '/api/report':
      return json(res, 500, { error: 'ReportService: database connection pool exhausted', requestId: 'req-7f3a' });
    case '/api/profile':
      // return json(res, 200, { fullName: 'Gift O.', role: 'Engineer' });
      return json(res, 200, { full_name: 'Gift O.', role: 'Engineer' });
    case '/api/cached':
      cachedVersion += 1;
      return json(res, 200, { version: cachedVersion, servedAt: new Date().toISOString() },
        { 'Cache-Control': 'public, max-age=60' });
    case '/api/flaky':
      if (url.searchParams.get('attempt') === '1') {
        return json(res, 503, { error: 'Service temporarily unavailable' }, { 'Retry-After': '1' });
      }
      return json(res, 200, { status: 'ok' });
    default:
      return json(res, 404, { error: 'Not found', path: p });
  }
}

function serveStatic(req, res, url) {
  const name = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(ROOT, name));
  if (!file.startsWith(ROOT + path.sep) || !file.endsWith('.html')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'session=abc123; Path=/; HttpOnly; SameSite=Lax'
    });
    res.end(data);
  });
}

function makeServer(port) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:' + port);
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204);
      return res.end();
    }
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, port, url);
    if (port === PORT_MAIN) return serveStatic(req, res, url);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
}

makeServer(PORT_MAIN).listen(PORT_MAIN, () => console.log('Lab pages:  http://localhost:' + PORT_MAIN));
makeServer(PORT_OTHER).listen(PORT_OTHER, () => console.log('Other origin (for the CORS exercise): http://localhost:' + PORT_OTHER));
