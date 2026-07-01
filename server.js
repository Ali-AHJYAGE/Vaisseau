// ============================================================
//  Serveur Le Vaisseau — HTTP (fichiers statiques) + WebSocket (relais)
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
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', ws => {
  if (wss.clients.size > 2) { ws.close(1008, 'Partie pleine'); return; }

  const count = wss.clients.size;
  console.log(`Joueur connecté (${count}/2)`);
  // Informer tout le monde du nombre de joueurs connectés
  broadcast({ type: 'players', count });

  ws.on('message', data => {
    wss.clients.forEach(c => {
      if (c !== ws && c.readyState === 1) c.send(data);
    });
  });

  ws.on('close', () => {
    console.log('Joueur déconnecté');
    // Attendre 4s avant de conclure que le départ est définitif
    // (les réseaux mobiles coupent brièvement et reconnectent)
    setTimeout(() => {
      const remaining = wss.clients.size;
      broadcast({ type: 'players', count: remaining });
      if (remaining < 2) {
        // Le partenaire est vraiment parti — on prévient sans forcer le reload
        broadcast({ type: 'partner-left' });
      }
    }, 4000);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Vaisseau — http://localhost:${PORT}`);
});
