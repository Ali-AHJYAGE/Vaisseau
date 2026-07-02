// ============================================================
//  Serveur Le Vaisseau — HTTP (statique) + WebSocket
//  v9 : serveur AUTORITAIRE sur les rôles + cache d'état + relais.
// ============================================================
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.json': 'application/json',
  '.png' : 'image/png',
};

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(__dirname, url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

// ── État partagé, autoritatif ───────────────────────────────
// Les rôles sont attribués à un identifiant client (cid), stable à travers
// les reconnexions et distinct entre deux onglets/appareils.
const roles = { innocent: null, imposteur: null };   // cid tenant chaque rôle
const cache = { inno: null, impo: null, world: null }; // derniers messages de jeu
const scores = {};                                    // cid → manches gagnées
let roundNum = 1, roundResolved = false;
const WINS_NEEDED = 2;                                 // best-of 3

let _nextId = 1;

function sendTo(ws, obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function wsByCid(cid) { for (const c of wss.clients) if (c.cid === cid && c.readyState === 1) return c; return null; }

function activeCount() {
  let n = 0; wss.clients.forEach(c => { if (c.readyState === 1) n++; }); return n;
}

function rolesMsg() {
  return { type: 'roles', innocent: !!roles.innocent, imposteur: !!roles.imposteur, count: activeCount() };
}

function broadcastRoles() {
  const msg = JSON.stringify(rolesMsg());
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', (ws, req) => {
  ws.id  = _nextId++;
  ws.ip  = (req.socket.remoteAddress || '?').replace('::ffff:', '');
  ws.cid = null;
  ws.missed = 0;
  ws.on('pong', () => { ws.missed = 0; });

  // Nettoyer les connexions mortes
  wss.clients.forEach(c => { if (c !== ws && c.readyState !== 1) c.terminate(); });

  console.log(`[#${ws.id} ${ws.ip}] connecté (${activeCount()}/2)`);
  // On envoie déjà l'état des rôles ; le reste attend le 'hello' (cid)
  sendTo(ws, rolesMsg());
  broadcastRoles();

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (_) { return; }

    // ── Présentation : le client annonce son identité stable ──
    if (m.type === 'hello') {
      ws.cid = String(m.cid || '').slice(0, 64) || ('anon' + ws.id);
      // Reconnexion du MÊME client : fermer son ancienne session zombie
      wss.clients.forEach(c => { if (c !== ws && c.cid === ws.cid) c.terminate(); });
      // S'il tenait déjà un rôle, on le lui redonne + on le resynchronise
      let mine = null;
      if (roles.innocent === ws.cid) mine = 'innocent';
      else if (roles.imposteur === ws.cid) mine = 'imposteur';
      sendTo(ws, rolesMsg());
      if (mine) sendTo(ws, { type: 'assigned', role: mine });
      if (cache.world) sendTo(ws, cache.world);
      if (cache.inno)  sendTo(ws, cache.inno);
      if (cache.impo)  sendTo(ws, cache.impo);
      return;
    }

    // ── Choix de rôle (verrouillage) ──
    if (m.type === 'pick') {
      const want = m.role;
      if (want !== 'innocent' && want !== 'imposteur') return;
      const id = ws.cid || ('anon' + ws.id);
      if (roles[want] === id) {                 // déjà à lui (reconnexion)
        sendTo(ws, { type: 'assigned', role: want });
      } else if (!roles[want]) {                // libre → on l'attribue
        for (const r of ['innocent', 'imposteur']) if (roles[r] === id) roles[r] = null; // libérer son ancien
        roles[want] = id;
        sendTo(ws, { type: 'assigned', role: want });
      } else {                                  // pris par l'autre → refus (sans rien perdre)
        sendTo(ws, { type: 'role-taken', role: want });
      }
      broadcastRoles();
      return;
    }

    // ── Reset volontaire : on repart à zéro ──
    if (m.type === 'reset') {
      roles.innocent = roles.imposteur = null;
      cache.inno = cache.impo = cache.world = null;
      for (const k in scores) delete scores[k];
      roundNum = 1; roundResolved = false;
      wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify({ type: 'reset' })); });
      return;
    }

    // ── Fin de manche : score + échange des rôles (ou fin de match) ──
    if (m.type === 'round-end') {
      if (roundResolved) return;                 // une seule résolution par manche
      const winRole = m.winner;
      if (winRole !== 'innocent' && winRole !== 'imposteur') return;
      const winCid = roles[winRole];
      const innoCid = roles.innocent, impoCid = roles.imposteur;
      if (!winCid || !innoCid || !impoCid) return;
      roundResolved = true;
      scores[winCid] = (scores[winCid] || 0) + 1;

      if (scores[winCid] >= WINS_NEEDED) {
        // Fin de match
        for (const cid of [innoCid, impoCid]) {
          const other = cid === innoCid ? impoCid : innoCid;
          sendTo(wsByCid(cid), { type: 'match-over', you: scores[cid] || 0, them: scores[other] || 0, youWon: cid === winCid });
        }
        roles.innocent = roles.imposteur = null;
        for (const k in scores) delete scores[k];
        roundNum = 1;
        cache.inno = cache.impo = cache.world = null;
      } else {
        // On laisse ~3,5 s pour afficher le résultat, PUIS manche suivante (rôles échangés)
        setTimeout(() => {
          roles.innocent = impoCid; roles.imposteur = innoCid;
          roundNum++;
          cache.inno = cache.impo = cache.world = null;
          for (const cid of [innoCid, impoCid]) {
            const other = cid === innoCid ? impoCid : innoCid;
            const newRole = roles.innocent === cid ? 'innocent' : 'imposteur';
            sendTo(wsByCid(cid), { type: 'new-round', role: newRole, round: roundNum, you: scores[cid] || 0, them: scores[other] || 0 });
          }
          roundResolved = false;
          broadcastRoles();
        }, 3500);
      }
      return;
    }

    // ── Cache des messages d'état (pour les (re)connexions) ──
    if (m.type === 'inno')  cache.inno  = m;
    else if (m.type === 'impo')  cache.impo  = m;
    else if (m.type === 'world') cache.world = m;

    // ── Relais à l'autre joueur ──
    const data = JSON.stringify(m);
    wss.clients.forEach(c => { if (c !== ws && c.readyState === 1) c.send(data); });
  });

  ws.on('error', err => console.log(`[#${ws.id} ${ws.ip}] erreur: ${err.message}`));

  ws.on('close', () => {
    console.log(`[#${ws.id} ${ws.ip}] déconnecté`);
    // Grâce : on ne libère le rôle/le compteur qu'après 4 s (flap mobile)
    setTimeout(() => {
      const stillHere = ws.cid && [...wss.clients].some(c => c.cid === ws.cid && c.readyState === 1);
      if (!stillHere) {
        for (const r of ['innocent', 'imposteur']) if (roles[r] === ws.cid) roles[r] = null;
        // Si plus personne, on vide le cache pour une partie propre ensuite
        if (activeCount() === 0) cache.inno = cache.impo = cache.world = null;
      }
      broadcastRoles();
    }, 4000);
  });
});

// Keepalive TOLÉRANT : ping toutes les 15 s, coupe après 3 sans réponse (~45 s)
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.missed >= 3) { ws.terminate(); return; }
    ws.missed++;
    try { ws.ping(); } catch (_) {}
  });
}, 15000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => console.log(`🚀 Vaisseau v9 — http://localhost:${PORT}`));
