// ============================================================
//  POINT D'ENTRÉE (v9)
// ============================================================

// ── LOBBY : créer / rejoindre / partie rapide / quitter ────
function _audioWake(){ if(typeof Sfx!=='undefined'){ Sfx.init(); Sfx.resume(); } }

function createGame() {
  if (!wsOpen()) { _setStatus('🔴 Connexion au serveur…'); return; }
  _audioWake(); tryFullscreen();
  send({ type: 'create', private: true });
  _setStatus('⏳ Création de la partie…');
}
function quickPlay() {
  if (!wsOpen()) { _setStatus('🔴 Connexion au serveur…'); return; }
  _audioWake(); tryFullscreen();
  send({ type: 'quick' });
  _setStatus('⚡ Recherche d\'une partie…');
}
function joinGame(code) {
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (code.length < 4) { _setStatus('Entre un code à 4 caractères'); return; }
  if (!wsOpen()) { _setStatus('🔴 Connexion au serveur…'); return; }
  _audioWake(); tryFullscreen();
  send({ type: 'join', code });
  _setStatus('⏳ Connexion à la partie…');
}
function leaveRoom() {
  send({ type: 'leave' });
  setRoomCode(null); myRole = null;
  _showLobby(); _setStatus('');
}

// L'utilisateur clique un rôle → on le DEMANDE au serveur (qui le verrouille).
// Le jeu ne démarre qu'à la réponse 'assigned' (voir network.js).
function pickRole(role) {
  if (localMode || gameStarted) return;
  tryFullscreen(); // ici on est dans le geste utilisateur (tap) → autorisé
  Sfx.init(); Sfx.resume();
  myRole = role; // préférence locale (permet la reconnexion + non-verrouillage de son propre bouton)
  _setStatus('⏳ Attribution du rôle…');
  if (ws && ws.readyState === WebSocket.OPEN) {
    send({ type: 'pick', role });
  } else {
    _setStatus('🔴 Pas encore connecté — réessaie dans un instant');
  }
}

// Plein écran là où c'est supporté (Android, iPad, desktop).
// iPhone Safari ne le permet pas dans le navigateur → voir « Ajouter à l'écran d'accueil ».
function tryFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) { try { req.call(el); } catch (_) {} }
}

function startWithRole(role) {
  if (gameStarted) return;
  gameStarted = true;
  myWins = 0; theirWins = 0; roundNum = 1;
  myRole = role;
  if (role === 'imposteur') S.impo.present = true;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('stage').style.display = 'block';
  document.getElementById('conn-status').textContent = '';
  roundBanner = 150;
  loop();
}

function toggleMute() {
  Sfx.init();
  const m = !Sfx.isMuted();
  Sfx.setMuted(m);
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = m ? '🔇' : '🔊';
}

function startLocal() {
  tryFullscreen();
  Sfx.init(); Sfx.resume();
  localMode = true;
  gameStarted = true;
  myRole = 'innocent';
  S.impo.present = true;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('stage').style.display = 'block';
  document.getElementById('conn-status').textContent = '';
  loop();
}

function resetGame() {
  send({ type: 'reset' }); // sans effet en localMode
  location.reload();
}
