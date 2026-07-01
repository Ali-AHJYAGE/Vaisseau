// ============================================================
//  RÉSEAU — WebSocket vers le serveur relais
// ============================================================

let ws = null;

function _setStatus(txt) {
  const el = document.getElementById('conn-status');
  if (el) el.textContent = txt;
}

function connectWS() {
  if (location.protocol === 'file:') return;

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    _setStatus('🟢 Connecté — attente du 2ᵉ joueur…');
  };

  ws.onmessage = e => {
    try { handleMessage(JSON.parse(e.data)); } catch(_) {}
  };

  ws.onclose = () => {
    ws = null;
    _setStatus('🔴 Déconnecté — reconnexion…');
    setTimeout(connectWS, 2000);
  };

  ws.onerror = () => ws && ws.close();
}

function handleMessage(m) {
  switch (m.type) {
    // Serveur informe du nombre de joueurs connectés
    case 'players':
      if (m.count >= 2) _setStatus('🟢 2 joueurs connectés — choisissez un rôle !');
      else              _setStatus('🟢 Connecté — attente du 2ᵉ joueur…');
      break;

    // Partenaire parti (avec délai de grâce — pas un reload forcé)
    case 'partner-left':
      _setStatus('🔴 Partenaire déconnecté');
      // Si la partie était en cours, on propose de rejouer sans forcer le reload
      if (typeof S !== 'undefined' && S.over === null && typeof frame !== 'undefined' && frame > 0) {
        S.over = 'disconnect';
      }
      break;

    // Reset volontaire (bouton Rejouer)
    case 'reset':
      location.reload();
      break;

    case 'inno':
      Object.assign(S.inno, m.data); break;
    case 'impo':
      S.impo.x = m.x; S.impo.y = m.y; S.impo.present = true; break;
    case 'world':
      S.tasks = m.tasks; S.sabotageUntil = m.sabotageUntil;
      S.oxygenUntil = m.oxygenUntil; S.over = m.over; break;
    case 'attack':
      if (myRole === 'innocent') applyHit(); break;
    case 'sabotage':
      S.sabotageUntil = m.until; break;
    case 'oxygen':
      S.oxygenUntil = m.until; break;
    case 'oxyfix':
      S.oxygenUntil = 0; break;
  }
}

function send(obj) {
  if (localMode) return;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function sendInno()          { send({ type: 'inno', data: { x: S.inno.x, y: S.inno.y, hearts: S.inno.hearts, alive: S.inno.alive } }); }
function sendImpo()          { send({ type: 'impo', x: S.impo.x, y: S.impo.y }); }
function sendWorld()         { send({ type: 'world', tasks: S.tasks, sabotageUntil: S.sabotageUntil, oxygenUntil: S.oxygenUntil, over: S.over }); }
function sendAttack()        { send({ type: 'attack' }); }
function sendSabotage(until) { send({ type: 'sabotage', until }); }
function sendOxygen(until)   { send({ type: 'oxygen', until }); }
function sendOxyFix()        { send({ type: 'oxyfix' }); }

connectWS();
