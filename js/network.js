// ============================================================
//  RÉSEAU — WebSocket vers le serveur relais
//  En mode local (même clavier) : send() ne fait rien.
// ============================================================

let ws = null;

function connectWS() {
  // Ne se connecte pas si le fichier est ouvert directement (file://)
  if (location.protocol === 'file:') return;

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[Vaisseau] Connecté au serveur');
    document.getElementById('conn-status').textContent = '🟢 Connecté — attente du 2ᵉ joueur…';
  };

  ws.onmessage = e => handleMessage(JSON.parse(e.data));

  ws.onclose = () => {
    ws = null;
    document.getElementById('conn-status').textContent = '🔴 Déconnecté — reconnexion…';
    setTimeout(connectWS, 2000);
  };

  ws.onerror = () => ws && ws.close();
}

function handleMessage(m) {
  if (m.type === 'reset')    { location.reload(); return; }
  if (m.type === 'inno')     { Object.assign(S.inno, m.data); }
  if (m.type === 'impo')     { S.impo.x = m.x; S.impo.y = m.y; S.impo.present = true; }
  if (m.type === 'world')    { S.tasks = m.tasks; S.sabotageUntil = m.sabotageUntil; S.oxygenUntil = m.oxygenUntil; S.over = m.over; }
  if (m.type === 'attack')   { if (myRole === 'innocent') applyHit(); }
  if (m.type === 'sabotage') { S.sabotageUntil = m.until; }
  if (m.type === 'oxygen')   { S.oxygenUntil = m.until; }
  if (m.type === 'oxyfix')   { S.oxygenUntil = 0; }
}

// Fonction d'envoi centrale — toujours passer par ici
function send(obj) {
  if (localMode) return;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

// Wrappers (identiques à l'ancienne version BroadcastChannel)
function sendInno()          { send({ type: 'inno', data: { x: S.inno.x, y: S.inno.y, hearts: S.inno.hearts, alive: S.inno.alive } }); }
function sendImpo()          { send({ type: 'impo', x: S.impo.x, y: S.impo.y }); }
function sendWorld()         { send({ type: 'world', tasks: S.tasks, sabotageUntil: S.sabotageUntil, oxygenUntil: S.oxygenUntil, over: S.over }); }
function sendAttack()        { send({ type: 'attack' }); }
function sendSabotage(until) { send({ type: 'sabotage', until }); }
function sendOxygen(until)   { send({ type: 'oxygen', until }); }
function sendOxyFix()        { send({ type: 'oxyfix' }); }

connectWS();
