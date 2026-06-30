// ============================================================
//  Serveur Le Vaisseau — HTTP (fichiers statiques) + WebSocket (relais)
//  Usage : node server.js
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
};

// ── Serveur HTTP : sert les fichiers statiques du dossier courant ──
const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, url);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('404 — fichier introuvable'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

// ── WebSocket : relais entre les deux joueurs ──────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  const nb = wss.clients.size;
  if (nb > 2) { ws.close(1008, 'Partie pleine (2 joueurs max)'); return; }

  console.log(`Joueur connecté (${nb}/2)`);

  ws.on('message', data => {
    // Transmettre le message à l'autre joueur
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === 1) client.send(data);
    });
  });

  ws.on('close', () => {
    console.log('Joueur déconnecté');
    // Prévenir l'autre joueur pour qu'il reload
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: 'reset' }));
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Le Vaisseau — serveur lancé sur http://localhost:${PORT}`);
  console.log('   Ouvre cette URL dans deux onglets (ou partage-la via ngrok)\n');
});
