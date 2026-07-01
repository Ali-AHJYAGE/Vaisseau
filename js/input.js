// ============================================================
//  ENTRÉES — clavier + vecteur tactile (mis à jour par touch.js)
// ============================================================
const keys = {};
const touchVec = {dx: 0, dy: 0}; // mis à jour par touch.js

addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function ax(neg, pos) { return (keys[pos]?1:0) - (keys[neg]?1:0); }

function inputVec() {
  let dx = ax('arrowleft','arrowright') + ax('q','d') + ax('a','d') + touchVec.dx;
  let dy = ax('arrowup','arrowdown')    + ax('z','s') + ax('w','s') + touchVec.dy;
  dx = Math.max(-1, Math.min(1, dx));
  dy = Math.max(-1, Math.min(1, dy));
  const l = Math.hypot(dx, dy) || 1;
  return {dx: dx/l, dy: dy/l};
}

// Mode local — touches séparées par joueur
function inputVecInno() {
  let dx = ax('q','d') + ax('a','d') + touchVec.dx;
  let dy = ax('z','s') + ax('w','s') + touchVec.dy;
  dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
  const l = Math.hypot(dx, dy) || 1; return {dx: dx/l, dy: dy/l};
}
function inputVecImpo() {
  let dx = ax('arrowleft','arrowright');
  let dy = ax('arrowup','arrowdown');
  const l = Math.hypot(dx, dy) || 1; return {dx: dx/l, dy: dy/l};
}

// Espace → action (clavier desktop)
let spacePressed = false;
addEventListener('keydown', e => { if (e.key===' ' && !spacePressed) { spacePressed=true; onAction(); } });
addEventListener('keyup',   e => { if (e.key===' ') spacePressed = false; });

// Entrée → action imposteur en mode local
let enterPressed = false;
addEventListener('keydown', e => { if (e.key==='Enter' && !enterPressed && localMode) { enterPressed=true; onActionImpo(); } });
addEventListener('keyup',   e => { if (e.key==='Enter') enterPressed = false; });

// Échap → fermer un mini-jeu
addEventListener('keydown', e => { if (e.key==='Escape' && minigameActive) closeMinigame(false); });
