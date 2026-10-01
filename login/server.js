/**
 * server.js - a very small login in front of an Eagle 3D Streaming iframe.
 *
 *   node login/server.js            then open http://localhost:3000
 *
 * No npm packages: Node 18 or newer is all it needs.
 *
 * What it does
 * ------------
 *  1. Serves the login page in ./public.
 *  2. POST /api/login  { username, password }
 *       - checks them against users.json (passwords are stored as salted
 *         scrypt hashes, never as plain text - add users with add-user.js),
 *       - on success answers { ok: true, streamUrl }, the address the page puts
 *         into the iframe,
 *       - on failure answers 401 { ok: false } and says nothing about which of
 *         the two was wrong.
 *
 * Why the URL comes from the server
 * ---------------------------------
 * If the stream address were written into the page, anyone could read it with
 * "view source" and skip the login. Here the page only learns it after a correct
 * login. Note what this does NOT do: once someone has logged in, the address is
 * in their browser and they could share it. For a stream that must stay private
 * per viewer, use the Web SDK version of this example (it hands out a single-use
 * session token instead of a reusable address), or set a password on the stream
 * link itself in the Control Panel.
 *
 * Settings: config.json next to this file (copy config.example.json). Never put
 * real passwords in users.json by hand - use add-user.js.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const PUBLIC_DIR = path.join(DIR, 'public');
const configFile = fs.existsSync(path.join(DIR, 'config.json')) ? 'config.json' : 'config.example.json';
const config = JSON.parse(fs.readFileSync(path.join(DIR, configFile), 'utf8'));
const PORT = Number(process.env.PORT || config.port || 3000);

function loadUsers() {
    return JSON.parse(fs.readFileSync(path.join(DIR, 'users.json'), 'utf8'));
}

/** True when the password matches the stored "salt:hash". Constant time. */
function passwordMatches(password, stored) {
    const [salt, hash] = String(stored || '').split(':');
    if (!salt || !hash) return false;
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

/* A small brake on guessing: after 5 wrong attempts from one address, refuse
 * further attempts from it for 5 minutes. In memory - it resets when the
 * server restarts, which is fine for an example. */
const failures = new Map(); // ip -> { count, until }
function blocked(ip) {
    const f = failures.get(ip);
    return f && f.until && f.until > Date.now();
}
function recordFailure(ip) {
    const f = failures.get(ip) || { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= 5) { f.until = Date.now() + 5 * 60 * 1000; f.count = 0; }
    failures.set(ip, f);
}

function sendJson(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > 10000) { reject(new Error('too large')); req.destroy(); }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); } // no ../ escapes
    fs.readFile(file, (err, content) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(content);
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/login') {
        const ip = req.socket.remoteAddress;
        if (blocked(ip)) return sendJson(res, 429, { ok: false, error: 'Too many attempts. Try again in a few minutes.' });
        let body;
        try { body = JSON.parse(await readBody(req)); } catch (e) { return sendJson(res, 400, { ok: false }); }
        const user = loadUsers()[String(body.username || '')];
        if (user && passwordMatches(body.password, user.passwordHash)) {
            failures.delete(ip);
            // A user may be given their own stream link; otherwise everyone gets the default one.
            return sendJson(res, 200, { ok: true, streamUrl: user.streamUrl || config.streamUrl });
        }
        recordFailure(ip);
        return sendJson(res, 401, { ok: false, error: 'Wrong username or password.' });
    }
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405); res.end();
});

server.listen(PORT, () => console.log(`Login example on http://localhost:${PORT}  (settings: ${configFile})`));
