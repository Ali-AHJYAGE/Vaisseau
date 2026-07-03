// ============================================================
//  RÉSEAU — WebSocket vers le serveur (v9)
//  Rôles verrouillés côté serveur, état mis en cache et resynchronisé.
// ============================================================

let ws = null;
let _msgCount = 0;
function wsReady()  { return ws ? ws.readyState : -1; }
function msgCount() { return _msgCount; }

// Identité stable du client (survit aux reconnexions) — sert au serveur pour
// reconnaître un joueur qui revient sans le confondre avec un autre onglet.
const CID = (() => {
  try {
    let c = localStorage.getItem('vaisseau-cid');
    if (!c) { c = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('vaisseau-cid', c); }
    return c;
  } catch (_) { return Math.random().toString(36).slice(2); }
})();

function _setStatus(txt) {
  const el = document.getElementById('conn-status');
  if (el) el.textContent = txt;
}

function connectWS() {
  if (location.protocol === 'file:') return;
  // Jamais deux connexions en parallèle
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    _setStatus('🟢 Connecté…');
    // 1re chose : s'annoncer avec notre identité stable
    ws.send(JSON.stringify({ type: 'hello', cid: CID }));
    // Reconnexion en cours de partie : redemander notre rôle
    if (myRole && !localMode) ws.send(JSON.stringify({ type: 'pick', role: myRole }));
  };
  ws.onmessage = e => { try { handleMessage(JSON.parse(e.data)); } catch (err) { console.error('[WS]', err); } };
  ws.onclose   = () => { ws = null; _setStatus('🔴 Reconnexion…'); setTimeout(connectWS, 1000); };
  ws.onerror   = () => ws && ws.close();
}

// Mobile : reconnexion au retour d'arrière-plan / veille
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (!ws || ws.readyState > 1)) connectWS();
});

function handleMessage(m) {
  _msgCount++;
  switch (m.type) {

    // ── Disponibilité des rôles + nombre de joueurs ──
    case 'roles':
      _applyRoles(m);
      break;

    // ── Le serveur nous attribue le rôle demandé → on démarre ──
    case 'assigned':
      if (!gameStarted) startWithRole(m.role);
      break;

    // ── Rôle déjà pris ──
    case 'role-taken':
      if (myRole === m.role) myRole = null; // annuler la préférence refusée
      _setStatus(`❌ ${m.role === 'imposteur' ? 'Le chat' : 'La souris'} est déjà pris·e — prends l'autre`);
      break;

    // ── Reset global ──
    case 'reset':
      location.reload();
      break;

    // ── État de jeu ──
    case 'inno':
      Object.assign(S.inno, m.data); S.inno.synced = true; break;
    case 'impo':
      S.impo.x = m.x; S.impo.y = m.y; S.impo.present = true;
      if (m.weapon) S.impo.weapon = m.weapon; break;
    case 'world': {
      const before = S.tasks ? Object.values(S.tasks).filter(Boolean).length : 0;
      S.tasks = m.tasks; S.over = m.over;
      const after = Object.values(S.tasks).filter(Boolean).length;
      if (after > before && typeof Sfx !== 'undefined') Sfx.task(); // ping quand une tâche tombe
      break;
    }
    case 'attack':
      if (myRole === 'innocent') applyHit(m.dmg); break;
    case 'sabotage':
      S.sabotageUntil = Date.now() + SAB_DURATION_MS; if(typeof Sfx!=='undefined') Sfx.sabotage(); break;
    case 'oxygen':
      S.oxygenUntil = Date.now() + OXY_DURATION_MS; if(typeof Sfx!=='undefined') Sfx.sabotage(); break;
    case 'oxyfix':
      S.oxygenUntil = 0; break;
    case 'doors':
      S.doorsUntil = Date.now() + DOOR_DURATION_MS; if(typeof Sfx!=='undefined') Sfx.door(); break;

    // ── Manches / score ──
    case 'new-round':
      myWins = m.you; theirWins = m.them;
      startRound(m.role, m.round);
      break;
    case 'match-over':
      myWins = m.you; theirWins = m.them;
      S.over = m.youWon ? 'match-win' : 'match-lose';
      break;
  }
}

// Applique l'état des rôles au menu (verrouillage) et au statut de connexion
function _applyRoles(m) {
  const bi = document.getElementById('pick-inno');
  const bp = document.getElementById('pick-impo');
  if (bi && bp && !gameStarted) {
    _lockButton(bi, m.innocent && myRole !== 'innocent');
    _lockButton(bp, m.imposteur && myRole !== 'imposteur');
  }

  if (!gameStarted) {
    if (m.count >= 2)      _setStatus('🟢 2 joueurs — choisissez souris ou chat !');
    else                   _setStatus('🟢 Connecté — en attente du 2ᵉ joueur…');
  }

  // En jeu : gérer le départ / retour du partenaire (compteur)
  if (gameStarted && typeof S !== 'undefined') {
    if (m.count >= 2) {
      partnerGoneAt = 0; _lastWorld = '';
      if (S.over === 'disconnect') { S.over = null; const b = document.getElementById('banner'); if (b) b.style.display = 'none'; }
    } else if (S.over === null && partnerGoneAt === 0 && frame > 0) {
      partnerGoneAt = frame;
    }
  }
}

function _lockButton(btn, locked) {
  btn.disabled = locked;
  btn.style.opacity = locked ? '0.4' : '1';
  btn.style.pointerEvents = locked ? 'none' : 'auto';
}

function send(obj) {
  if (localMode) return;
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function sendInno() { send({ type: 'inno', data: { x: S.inno.x, y: S.inno.y, hearts: S.inno.hearts, alive: S.inno.alive } }); }
function sendImpo() { send({ type: 'impo', x: S.impo.x, y: S.impo.y, weapon: S.impo.weapon }); }

// Le monde (tâches, fin) change rarement : on ne l'envoie que s'il change
let _lastWorld = '';
function sendWorld() {
  const w = { type: 'world', tasks: S.tasks, over: S.over };
  const sig = JSON.stringify(w);
  if (sig === _lastWorld) return;
  _lastWorld = sig;
  send(w);
}

function sendAttack(dmg){ send({ type: 'attack', dmg: dmg||1 }); }
function sendSabotage() { send({ type: 'sabotage' }); }
function sendOxygen()   { send({ type: 'oxygen' }); }
function sendOxyFix()   { send({ type: 'oxyfix' }); }
function sendDoors()    { send({ type: 'doors' }); }

connectWS();
