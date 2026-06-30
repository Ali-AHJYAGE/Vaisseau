// ============================================================
//  ÉTAT GLOBAL
//  La synchro réseau est dans network.js (WebSocket).
// ============================================================
let myRole = null;
let localMode = false;

const S = {
  inno: { x: 800, y: 600, hearts: HEARTS_MAX, alive: true },
  impo: { x: 800, y: 520, present: false },
  tasks: { t1: false, t2: false, t3: false, t4: false },
  sabotageUntil: 0,
  oxygenUntil: 0,
  over: null,
};

let frame = 0;
let attackReady = 0, healReady = 0, sabReady = 0, oxyReady = 0;
let tpCooldown = 0;
let minigameActive = null;
