const http = require('http'), fs = require('fs'), path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'bracket.db'));
db.exec(`CREATE TABLE IF NOT EXISTS tournaments(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  players TEXT NOT NULL, rounds TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });

http.createServer(async (req, res) => {
  const m = new URL(req.url, 'http://x').pathname.match(/^\/api\/tournaments(?:\/(\d+))?$/);
  if (m) {
    const id = m[1];
    if (req.method === 'GET' && !id)
      return send(res, 200, db.prepare('SELECT id,name,updated_at FROM tournaments ORDER BY updated_at DESC, id DESC').all());
    if (req.method === 'GET') {
      const r = db.prepare('SELECT * FROM tournaments WHERE id=?').get(id);
      return r ? send(res, 200, { ...r, players: JSON.parse(r.players), rounds: JSON.parse(r.rounds) }) : send(res, 404, { error: 'not found' });
    }
    if (req.method === 'POST') {
      const b = await readBody(req);
      const i = db.prepare('INSERT INTO tournaments(name,players,rounds) VALUES(?,?,?)').run(b.name || 'Turnamen', JSON.stringify(b.players || []), JSON.stringify(b.rounds || []));
      return send(res, 201, { id: Number(i.lastInsertRowid) });
    }
    if (req.method === 'PUT') {
      const b = await readBody(req);
      db.prepare('UPDATE tournaments SET name=?,players=?,rounds=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(b.name || 'Turnamen', JSON.stringify(b.players || []), JSON.stringify(b.rounds || []), id);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM tournaments WHERE id=?').run(id);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  }
  fs.readFile(path.join(__dirname, 'public', 'index.html'), (e, d) => {
    if (e) { res.writeHead(500); return res.end('index.html tidak ditemukan'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d);
  });
}).listen(3000, '127.0.0.1', () => console.log('Bracket berjalan di http://localhost:3000'));
